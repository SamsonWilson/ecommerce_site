from django.utils.translation import gettext as _
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import ProductVariant
from pricing.services import resolve_price

from .services import available_methods, normalize_country, served_countries

MAX_QUOTE_LINES = 100


class ShippingCountriesView(APIView):
    """GET /api/v1/shipping/countries/ : pays desservis (codes ISO)."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"countries": served_countries()})


class ShippingOptionsView(APIView):
    """
    POST /api/v1/shipping/options/ : modes et frais pour un pays et un panier.

    Le prix et le poids viennent de la base, jamais du navigateur : c'est le
    même calcul que celui du checkout, qui refait tout de son côté.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        country = normalize_country(request.data.get("country"))
        items = request.data.get("items")
        if not country or not isinstance(items, list) or not 0 < len(items) <= MAX_QUOTE_LINES:
            return Response({"detail": _("Requête invalide.")}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user if request.user.is_authenticated else None
        subtotal = weight = 0
        for item in items:
            if not isinstance(item, dict):
                continue
            quantity = item.get("quantity")
            if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity < 1:
                continue
            variants = ProductVariant.objects.select_related("product").filter(product__is_active=True)
            if isinstance(item.get("variant_id"), int):
                variant = variants.filter(pk=item["variant_id"]).first()
            elif isinstance(item.get("slug"), str):
                candidates = variants.filter(product__slug=item["slug"])
                variant = candidates.filter(stock__gt=0).first() or candidates.first()
            else:
                variant = None
            if variant:
                subtotal += resolve_price(variant, user=user).unit_price * quantity
                weight += variant.weight_grams * quantity

        options = [
            {
                "code": method.code,
                "name": method.translated("name"),
                "delay": method.translated("delay"),
                "cost": str(method.cost_for(subtotal)),
                "cash_on_delivery": method.cash_on_delivery,
                "is_pickup": method.is_pickup,
            }
            for method in available_methods(country, subtotal, weight)
        ]
        return Response({"options": options, "subtotal": str(subtotal), "weight_grams": weight})
