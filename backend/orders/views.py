import logging
import secrets
import uuid
from collections import Counter
from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone
from django.utils.translation import get_language, gettext as _
from rest_framework import generics, status, views
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from catalog.models import Product, ProductVariant, StockMovement
from pricing.services import resolve_price
from shipping.services import find_method, normalize_country
from accounts.permissions import HasStaffSection, staff_sections
from payments.emails import send_order_confirmation
from payments.providers import configured_providers
from payments.transfer import new_deadline, transfer_allowed
from .models import Order, OrderItem
from .serializers import OrderSerializer

logger = logging.getLogger(__name__)

# En ligne : paiement à la livraison ou au retrait, plus chaque prestataire
# configuré (voir payments/). Sans prestataire, une commande « carte »
# resterait impayée alors que le client croit avoir réglé.
def online_payment_methods(user=None):
    methods = {"cod", *configured_providers()}
    if transfer_allowed(user):
        methods.add("transfer")
    return methods


# La caisse encaisse aussi la carte sur son terminal, les espèces et les virements.
POS_PAYMENT_METHODS = {"card", "paypal", "cod", "cash", "transfer"}
MAX_ORDER_LINES = 100
TRUE_VALUES = ("true", "True", "1", 1, True)


def _reject(detail):
    """Refuse la commande : dans transaction.atomic(), tout est annulé."""
    raise ValidationError({"detail": detail})


def _shipping_cost(data, shipping_address, payment_method, subtotal, weight_grams):
    """
    Frais de port calculés par le serveur, d'après le pays, le poids et le
    montant. Le mode choisi doit être proposé pour cette commande précise.
    """
    country = normalize_country(shipping_address.get("country"))
    if not country:
        _reject(_("Pays de livraison invalide."))
    code = data.get("shipping_method") or shipping_address.get("method")
    method = find_method(code, country, subtotal, weight_grams) if isinstance(code, str) else None
    if method is None:
        _reject(_("Ce mode de livraison n'est pas disponible pour cette adresse."))
    if payment_method == "cod" and not method.cash_on_delivery:
        _reject(_("Le paiement à la livraison n'est pas proposé avec ce mode de livraison."))
    shipping_address.update(country=country, method=method.code, carrier=method.carrier)
    return method.cost_for(subtotal)


def _positive_int(value):
    """Entier >= 1, sinon None. Booléens et décimaux refusés : int() les tronquerait."""
    if isinstance(value, (bool, float)):
        return None
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if number >= 1 else None


def _is_valid_email(value):
    if not isinstance(value, str) or len(value) > 254:
        return False
    try:
        validate_email(value)
    except DjangoValidationError:
        return False
    return True


def _find_variant(raw_item):
    """
    Retrouve la variante demandée et la verrouille jusqu'à la fin de la commande.

    Aucun repli : un article inconnu fait échouer la commande plutôt que d'être
    remplacé par un autre produit.
    """
    variants = ProductVariant.objects.select_for_update(of=("self",)).select_related("product")
    raw_id = raw_item.get("variant_id") or raw_item.get("id")
    sku = raw_item.get("sku")
    slug = raw_item.get("slug")

    variant = None
    if raw_id:
        variant_id = _positive_int(raw_id)
        variant = variants.filter(pk=variant_id).first() if variant_id else None
    elif sku and isinstance(sku, str):
        variant = variants.filter(sku=sku).first()
    elif slug and isinstance(slug, str):
        # Même choix que ProductListSerializer._default_variant : le prix facturé
        # est celui que le client a vu en boutique.
        candidates = variants.filter(product__slug=slug)
        variant = candidates.filter(stock__gt=0).first() or candidates.first()

    if variant is None:
        _reject(_("Un article de votre panier n'existe plus."))
    return variant


def _check_online_sale(variant, qty, is_wholesale):
    """Mêmes règles que la boutique : un article qu'on ne voit pas ne se commande pas."""
    product = variant.product
    channels = (
        Product.SalesChannel.WHOLESALE if is_wholesale else Product.SalesChannel.RETAIL,
        Product.SalesChannel.BOTH,
    )
    if not product.is_active or product.sales_channel not in channels:
        _reject(_("Un article de votre panier n'est plus disponible."))
    # Le MOQ est un minimum de gros : un particulier achète à l'unité.
    if is_wholesale and qty < variant.moq:
        _reject(_("Quantité minimale de %(moq)s pour %(name)s.") % {"moq": variant.moq, "name": product.translated("name")})
    if variant.max_order_qty and qty > variant.max_order_qty:
        _reject(_("Quantité maximale de %(max)s pour %(name)s.") % {"max": variant.max_order_qty, "name": product.translated("name")})


def new_order_reference():
    return f"CMD-{timezone.now().year}-{uuid.uuid4().hex[:8].upper()}"


def _locked_items(order):
    """Lignes de la commande avec leurs déclinaisons verrouillées jusqu'à la fin de la transaction."""
    items = [item for item in order.items.all() if item.variant_id]
    variants = ProductVariant.objects.select_for_update().in_bulk([item.variant_id for item in items])
    return [(item, variants[item.variant_id]) for item in items]


def deduct_order_stock(order):
    """
    Sort du stock les articles de la commande et enregistre le mouvement.

    Sans effet si c'est déjà fait (virement réservé, puis payé). Les
    déclinaisons sont verrouillées : une vente simultanée ne peut pas
    écraser ce retrait (M5).
    """
    with transaction.atomic():
        if Order.objects.select_for_update().get(pk=order.pk).stock_deducted:
            order.stock_deducted = True
            return
        for item, variant in _locked_items(order):
            if variant.stock < item.quantity:
                # Payé alors que le stock est parti entre-temps : à traiter à la main.
                logger.warning(
                    "Stock insuffisant pour %s (%s) : %s commandés, %s en stock, commande %s",
                    variant.sku, variant.pk, item.quantity, variant.stock, order.reference,
                )
            variant.stock = max(0, variant.stock - item.quantity)
            variant.save(update_fields=["stock"])
            StockMovement.objects.create(
                variant=variant,
                quantity_delta=-item.quantity,
                reason=StockMovement.Reason.SALE,
                reference=order.reference,
            )
        Order.objects.filter(pk=order.pk).update(stock_deducted=True)
        order.stock_deducted = True


def restore_order_stock(order):
    """Rend au stock les articles d'une commande annulée ou remboursée, s'ils en étaient sortis."""
    with transaction.atomic():
        if not Order.objects.select_for_update().get(pk=order.pk).stock_deducted:
            order.stock_deducted = False
            return
        for item, variant in _locked_items(order):
            variant.stock += item.quantity
            variant.save(update_fields=["stock"])
            StockMovement.objects.create(
                variant=variant,
                quantity_delta=item.quantity,
                reason=StockMovement.Reason.RETURN,
                reference=order.reference,
            )
        Order.objects.filter(pk=order.pk).update(stock_deducted=False)
        order.stock_deducted = False


class CheckoutView(views.APIView):
    """
    POST /api/v1/checkout/
    Crée la commande côté serveur, puis retourne sa référence et son jeton secret.

    Route ouverte aux visiteurs : rien de ce qu'envoie le navigateur n'est cru sur
    parole. Le prix vient toujours de pricing.services.resolve_price, et seul un
    employé habilité à la caisse (section « orders ») peut encaisser une vente.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        if not isinstance(data, dict):
            _reject(_("Requête invalide."))

        user = request.user if request.user.is_authenticated else None
        is_pos = "orders" in staff_sections(user)
        mark_paid = data.get("mark_paid") in TRUE_VALUES
        if mark_paid and not is_pos:
            raise PermissionDenied(_("Seule la caisse peut enregistrer une vente payée."))

        email = data.get("email") or (user.email if user else None)
        if not email:
            _reject(_("Adresse email obligatoire."))
        if not _is_valid_email(email):
            _reject(_("Adresse email invalide."))

        raw_items = data.get("items")
        if not raw_items:
            _reject(_("Le panier est vide."))
        if not isinstance(raw_items, list) or len(raw_items) > MAX_ORDER_LINES:
            _reject(_("Liste d'articles invalide."))

        shipping_address = data.get("shipping_address") or {}
        if not isinstance(shipping_address, dict):
            _reject(_("Adresse de livraison invalide."))
        # Le nom du caissier ne vient jamais de l'adresse saisie par un client.
        shipping_address = {
            key: value for key, value in shipping_address.items()
            if key not in ("cashier", "cashier_name")
        }

        payment_method = data.get("payment_method", "card" if is_pos else "cod")
        allowed_methods = POS_PAYMENT_METHODS if is_pos else online_payment_methods(user)
        if not isinstance(payment_method, str) or payment_method not in allowed_methods:
            _reject(_("Moyen de paiement invalide."))
        shipping_address["payment_method"] = payment_method

        if is_pos:
            shipping_address["cashier_name"] = (
                data.get("cashier_name") or data.get("cashier")
                or user.get_full_name() or user.email
            )

        subtotal = Decimal("0.00")
        weight_grams = 0
        order_items_to_create = []

        with transaction.atomic():
            ref = new_order_reference()
            is_wholesale = False

            if request.user.is_authenticated and hasattr(request.user, "profile"):
                if (
                    request.user.profile.account_type == "WHOLESALE"
                    and request.user.profile.status == "APPROVED"
                ):
                    is_wholesale = True

            # Deux lignes du même article comptent ensemble pour le stock et les limites.
            variants = {}
            quantities = Counter()
            for raw_item in raw_items:
                if not isinstance(raw_item, dict):
                    _reject(_("Article invalide."))
                qty = _positive_int(raw_item.get("quantity", 1))
                if qty is None:
                    _reject(_("Quantité invalide."))
                variant = _find_variant(raw_item)
                variants[variant.pk] = variant
                quantities[variant.pk] += qty

            for variant_pk, qty in quantities.items():
                variant = variants[variant_pk]
                if not is_pos:
                    _check_online_sale(variant, qty, is_wholesale)
                if variant.stock < qty:
                    _reject(
                        _("Stock insuffisant pour %(name)s (Disponible : %(stock)s).")
                        % {"name": variant.product.translated("name"), "stock": variant.stock}
                    )

                unit_price = resolve_price(variant, user=user).unit_price
                subtotal += unit_price * qty
                weight_grams += variant.weight_grams * qty

                order_items_to_create.append(
                    {
                        "variant": variant,
                        "product_name": variant.product.name,
                        "sku": variant.sku,
                        "unit_price": unit_price,
                        "quantity": qty,
                    }
                )

            shipping_cost = Decimal("0.00")  # vente en caisse : rien à expédier
            if not is_pos:
                shipping_cost = _shipping_cost(data, shipping_address, payment_method, subtotal, weight_grams)
            total_amount = subtotal + shipping_cost

            order = Order.objects.create(
                reference=ref,
                customer=user,
                email=email,
                order_type=Order.OrderType.WHOLESALE if is_wholesale else Order.OrderType.RETAIL,
                status=Order.Status.PAID if mark_paid else Order.Status.PENDING,
                currency="EUR",
                subtotal=subtotal,
                shipping_cost=shipping_cost,
                tax_amount=Decimal("0.00"),
                total_amount=total_amount,
                shipping_address=shipping_address,
                payment_method=payment_method,
                public_token=secrets.token_urlsafe(32),
                language=get_language() or settings.LANGUAGE_CODE,
                payment_deadline=new_deadline() if not is_pos and payment_method == "transfer" else None,
            )

            for item_data in order_items_to_create:
                OrderItem.objects.create(order=order, **item_data)

            # Vente payée en caisse, ou virement : les articles sortent (ou sont
            # réservés) tout de suite. Un virement prend plusieurs jours.
            if mark_paid or order.payment_deadline:
                deduct_order_stock(order)

            if not is_pos and payment_method in ("cod", "transfer"):
                transaction.on_commit(lambda: send_order_confirmation(order.pk))

        return Response(
            {
                "order": OrderSerializer(order).data,
                # Remis une seule fois, au client qui vient de commander.
                "payment_token": order.public_token,
            },
            status=status.HTTP_201_CREATED,
        )


class OrderListView(generics.ListAPIView):
    """GET /api/v1/orders/ : Historique des commandes de l'utilisateur."""

    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related("items__variant__product", "payments")


class OrderDetailView(generics.RetrieveAPIView):
    """GET /api/v1/orders/{reference}/ : Détail d'une commande."""

    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    lookup_field = "reference"

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related("items__variant__product", "payments")


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
        qs = Order.objects.prefetch_related("items__variant__product", "customer", "payments").all()
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
    queryset = Order.objects.prefetch_related("items__variant__product", "customer", "payments").all()

    def perform_destroy(self, instance):
        if instance.payments.exists():
            raise ValidationError({"detail": _("Une commande liée à un paiement en ligne ne peut pas être supprimée.")})
        instance.delete()

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        new_status = serializer.validated_data.get("status")

        if new_status is not None and not Order.is_valid_transition(old_status, new_status):
            raise ValidationError({
                "detail": (
                    f"Transition de statut non autorisée : {old_status} -> {new_status}. "
                    "Les étapes doivent être suivies dans l'ordre."
                )
            })

        new_shipping = serializer.validated_data.get("shipping_cost")
        shipping_changed = new_shipping is not None and new_shipping != serializer.instance.shipping_cost
        if shipping_changed and serializer.instance.payment_method != "cod":
            raise ValidationError({"detail": _("Les frais de port ne peuvent changer que pour un paiement à la livraison.")})

        order = serializer.save()
        if shipping_changed:
            # Le livreur encaisse le total : il suit les frais de port réels.
            order.total_amount = order.subtotal + order.shipping_cost + order.tax_amount
            order.save(update_fields=["total_amount", "updated_at"])
        if old_status != order.status:
            if order.status == Order.Status.PAID and old_status != Order.Status.PAID:
                deduct_order_stock(order)
            elif order.status in [Order.Status.CANCELLED, Order.Status.REFUNDED]:
                # Rend seulement ce qui est sorti : rien pour une commande en
                # attente de paiement, tout pour un virement réservé.
                restore_order_stock(order)


