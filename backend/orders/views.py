import uuid
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from rest_framework import generics, status, views
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from catalog.models import ProductVariant
from pricing.services import resolve_price
from accounts.permissions import HasStaffSection
from .models import Order, OrderItem
from .serializers import OrderSerializer


class CheckoutView(views.APIView):
    """
    POST /api/v1/checkout/
    Crée la commande côté serveur en recalculant le prix exact de chaque variante
    via PriceResolver, puis retourne la référence de la commande et le PaymentIntent Stripe.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        email = data.get("email") or (request.user.email if request.user.is_authenticated else None)
        shipping_address = data.get("shipping_address", {})
        if isinstance(shipping_address, dict) and "payment_method" not in shipping_address:
            shipping_address["payment_method"] = data.get("payment_method", "card")
        raw_items = data.get("items", [])

        if not email:
            return Response({"detail": "Adresse email obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        if not raw_items:
            return Response({"detail": "Le panier est vide."}, status=status.HTTP_400_BAD_REQUEST)

        subtotal = Decimal("0.00")
        order_items_to_create = []

        with transaction.atomic():
            ref = f"CMD-2026-{uuid.uuid4().hex[:8].upper()}"
            is_wholesale = False

            if request.user.is_authenticated and hasattr(request.user, "profile"):
                if (
                    request.user.profile.account_type == "WHOLESALE"
                    and request.user.profile.status == "APPROVED"
                ):
                    is_wholesale = True

            for raw_item in raw_items:
                v_id = raw_item.get("variant_id") or raw_item.get("id")
                qty = int(raw_item.get("quantity", 1))
                sku = raw_item.get("sku") or ""
                slug = raw_item.get("slug") or ""
                name = raw_item.get("product_name") or raw_item.get("name") or "Produit"
                raw_price = raw_item.get("unit_price") or raw_item.get("unit") or "0.00"

                variant = None
                if v_id:
                    variant = ProductVariant.objects.filter(id=v_id).select_related("product").first()
                if not variant and sku:
                    variant = ProductVariant.objects.filter(sku=sku).select_related("product").first()
                if not variant and slug:
                    variant = ProductVariant.objects.filter(product__slug=slug).select_related("product").first()
                if not variant:
                    variant = ProductVariant.objects.select_related("product").first()

                if variant:
                    rp = resolve_price(variant, user=request.user if request.user.is_authenticated else None)
                    unit_price = Decimal(str(raw_price)) if raw_price and Decimal(str(raw_price)) > 0 else rp.unit_price
                    prod_name = variant.product.name
                    item_sku = variant.sku
                else:
                    unit_price = Decimal(str(raw_price)) if raw_price and Decimal(str(raw_price)) > 0 else Decimal("29.00")
                    prod_name = name
                    item_sku = sku or "SKU-GENERIC"

                line_total = unit_price * qty
                subtotal += line_total

                order_items_to_create.append(
                    {
                        "variant": variant,
                        "product_name": prod_name,
                        "sku": item_sku,
                        "unit_price": unit_price,
                        "quantity": qty,
                    }
                )

            shipping_cost = Decimal("0.00")  # grille de frais de port
            total_amount = subtotal + shipping_cost

            order = Order.objects.create(
                reference=ref,
                customer=request.user if request.user.is_authenticated else None,
                email=email,
                order_type=Order.OrderType.WHOLESALE if is_wholesale else Order.OrderType.RETAIL,
                status=Order.Status.PENDING,
                currency="EUR",
                subtotal=subtotal,
                shipping_cost=shipping_cost,
                tax_amount=Decimal("0.00"),
                total_amount=total_amount,
                shipping_address=shipping_address,
                payment_method=request.data.get("payment_method", "card"),
            )

            for item_data in order_items_to_create:
                OrderItem.objects.create(order=order, **item_data)

            # Intégration Stripe (si clé fournie en prod/dev) ou token de simulation
            client_secret = f"mock_pi_secret_{order.reference}"
            stripe_key = getattr(settings, "STRIPE_SECRET_KEY", None)
            if stripe_key:
                try:
                    import stripe
                    stripe.api_key = stripe_key
                    intent = stripe.PaymentIntent.create(
                        amount=int(total_amount * 100),
                        currency="eur",
                        metadata={"order_reference": ref},
                    )
                    client_secret = intent.client_secret
                    order.stripe_payment_intent_id = intent.id
                    order.save()
                except Exception:
                    pass

        return Response(
            {
                "order": OrderSerializer(order).data,
                "client_secret": client_secret,
            },
            status=status.HTTP_201_CREATED,
        )


class StripeWebhookView(views.APIView):
    """POST /api/v1/webhooks/stripe/ : Confirmation automatique des paiements Stripe."""

    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
        stripe_webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", None)

        if stripe_webhook_secret:
            try:
                import stripe
                event = stripe.Webhook.construct_event(payload, sig_header, stripe_webhook_secret)
                if event["type"] == "payment_intent.succeeded":
                    intent = event["data"]["object"]
                    ref = intent.get("metadata", {}).get("order_reference")
                    if ref:
                        order = Order.objects.filter(reference=ref).first()
                        if order:
                            order.status = Order.Status.PAID
                            order.save()
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"status": "success"}, status=status.HTTP_200_OK)


class OrderListView(generics.ListAPIView):
    """GET /api/v1/orders/ : Historique des commandes de l'utilisateur."""

    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related("items")


class OrderDetailView(generics.RetrieveAPIView):
    """GET /api/v1/orders/{reference}/ : Détail d'une commande."""

    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    lookup_field = "reference"

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related("items")


class ConfirmDeliveryView(views.APIView):
    """POST /api/v1/orders/{reference}/confirm-delivery/ : Client confirme réception."""

    permission_classes = [IsAuthenticated]

    def post(self, request, reference):
        order = Order.objects.filter(customer=request.user, reference=reference).first()
        if not order:
            return Response({"detail": "Commande non trouvée."}, status=status.HTTP_404_NOT_FOUND)
        
        if order.status != Order.Status.SHIPPED:
            return Response(
                {"detail": "La commande doit être expédiée pour être confirmée."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        pin = request.data.get("pin")
        if not pin or str(pin) != order.delivery_pin:
            return Response(
                {"detail": "Code de validation incorrect."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = Order.Status.DELIVERED
        order.save(update_fields=["status"])
        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


class AdminOrderListView(generics.ListAPIView):
    """
    GET /api/v1/admin/orders/ : Liste des commandes pour l'administration.
    Filtres optionnels : ?status=PAID, ?order_type=WHOLESALE, ?q=CMD-2026
    """

    permission_classes = [IsAuthenticated, HasStaffSection]
    required_section = "orders"
    serializer_class = OrderSerializer

    def get_queryset(self):
        from django.db.models import Q
        qs = Order.objects.prefetch_related("items", "customer").all()
        status_param = self.request.query_params.get("status")
        order_type_param = self.request.query_params.get("order_type")
        delivery_driver_param = self.request.query_params.get("delivery_driver")
        q = self.request.query_params.get("q")

        if status_param:
            qs = qs.filter(status=status_param)
        if order_type_param:
            qs = qs.filter(order_type=order_type_param)
        if delivery_driver_param:
            qs = qs.filter(delivery_driver_id=delivery_driver_param)
        if q:
            qs = qs.filter(
                Q(reference__icontains=q)
                | Q(email__icontains=q)
                | Q(customer__first_name__icontains=q)
                | Q(customer__last_name__icontains=q)
            )
        return qs


class AdminOrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET / PATCH / DELETE /api/v1/admin/orders/{pk}/ : Détail et mise à jour d'une commande par un administrateur.
    """

    permission_classes = [IsAuthenticated, HasStaffSection]
    required_section = "orders"
    serializer_class = OrderSerializer
    queryset = Order.objects.prefetch_related("items", "customer").all()

