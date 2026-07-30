from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from catalog.models import ProductVariant
from pricing.services import resolve_price
from .models import Cart, CartItem
from .serializers import CartSerializer, CartItemSerializer


class CartViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _get_cart(self, user):
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart

    def list(self, request):
        """GET /api/v1/cart/ : Récupère le panier de l'utilisateur."""
        cart = self._get_cart(request.user)
        serializer = CartSerializer(cart, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def items(self, request):
        """POST /api/v1/cart/items/ : Ajoute un article ou augmente sa quantité."""
        variant_id = request.data.get("variant_id") or request.data.get("variant")
        quantity = int(request.data.get("quantity", 1))

        try:
            variant = ProductVariant.objects.get(id=variant_id)
        except ProductVariant.DoesNotExist:
            return Response({"detail": "Variante introuvable."}, status=status.HTTP_404_NOT_FOUND)

        rp = resolve_price(variant, user=request.user)
        if quantity < rp.moq:
            return Response(
                {"detail": f"La quantité minimale de commande (MOQ) est de {rp.moq}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart = self._get_cart(request.user)
        item, created = CartItem.objects.get_or_create(cart=cart, variant=variant, defaults={"quantity": quantity})
        if not created:
            item.quantity += quantity
            item.save()

        serializer = CartSerializer(cart, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["patch"], url_path="items/(?P<item_id>[^/.]+)")
    def update_item(self, request, item_id=None):
        """PATCH /api/v1/cart/items/{id}/ : Modifie la quantité d'un article."""
        cart = self._get_cart(request.user)
        try:
            item = CartItem.objects.get(id=item_id, cart=cart)
        except CartItem.DoesNotExist:
            return Response({"detail": "Article du panier introuvable."}, status=status.HTTP_404_NOT_FOUND)

        quantity = int(request.data.get("quantity", item.quantity))
        rp = resolve_price(item.variant, user=request.user)
        if quantity < rp.moq:
            return Response(
                {"detail": f"La quantité minimale de commande est de {rp.moq}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.quantity = quantity
        item.save()
        serializer = CartSerializer(cart, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["delete"], url_path="items/(?P<item_id>[^/.]+)")
    def remove_item(self, request, item_id=None):
        """DELETE /api/v1/cart/items/{id}/ : Supprime un article du panier."""
        cart = self._get_cart(request.user)
        CartItem.objects.filter(id=item_id, cart=cart).delete()
        serializer = CartSerializer(cart, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def sync(self, request):
        """
        POST /api/v1/cart/sync/ : Fusionne le panier invité (localStorage)
        avec le panier serveur à la connexion.
        Payload attendu : `{"items": [{"variant_id": 1, "quantity": 2}, ...]}`
        """
        cart = self._get_cart(request.user)
        items_data = request.data.get("items", [])

        for item_info in items_data:
            v_id = item_info.get("variant_id") or item_info.get("id")
            qty = int(item_info.get("quantity", 1))
            try:
                variant = ProductVariant.objects.get(id=v_id)
                rp = resolve_price(variant, user=request.user)
                qty = max(qty, rp.moq)
                cart_item, created = CartItem.objects.get_or_create(
                    cart=cart, variant=variant, defaults={"quantity": qty}
                )
                if not created:
                    cart_item.quantity = max(cart_item.quantity, qty)
                    cart_item.save()
            except ProductVariant.DoesNotExist:
                continue

        serializer = CartSerializer(cart, context={"request": request})
        return Response(serializer.data)
