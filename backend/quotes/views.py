import hmac
from datetime import date
from decimal import Decimal, InvalidOperation

from django.utils.translation import gettext as _
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasStaffSection
from orders.serializers import OrderSerializer
from shipping.services import normalize_country

from .models import QuoteRequest
from .serializers import AdminQuoteSerializer, PublicQuoteSerializer, QuoteCreateSerializer, QuoteSerializer
from .services import ADDRESS_FIELDS, QuoteError, accept_quote, payment_methods_for_quote, send_quote


def _quote_error(exc):
    messages = {
        "not_editable": _("Ce devis ne peut plus être modifié."),
        "no_items": _("Ce devis ne contient aucun article à chiffrer."),
        "missing_prices": _("Indiquez un prix pour chaque article."),
        "not_quoted": _("Ce devis n'est pas ou plus disponible."),
        "expired": _("Ce devis a expiré. Demandez-nous une mise à jour."),
        "payment_method": _("Moyen de paiement invalide."),
    }
    if exc.code == "stock":
        detail = _("Stock insuffisant pour %(name)s (Disponible : %(stock)s).") % exc.params
    else:
        detail = messages.get(exc.code, _("Requête invalide."))
    return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)


def _money(value, allow_none=False):
    if value in (None, "") and allow_none:
        return None
    try:
        amount = Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return False
    return amount if amount >= 0 else False


class QuoteListCreateView(generics.ListCreateAPIView):
    """
    POST : dépôt d'une demande de devis (ouvert — client connecté ou invité).
    GET  : suivi de SES propres devis (authentification requise).
    """

    def get_permissions(self):
        return [AllowAny()] if self.request.method == "POST" else [IsAuthenticated()]

    def get_serializer_class(self):
        return QuoteCreateSerializer if self.request.method == "POST" else QuoteSerializer

    def get_queryset(self):
        # Un client ne voit jamais que ses propres devis.
        return QuoteRequest.objects.filter(customer=self.request.user).prefetch_related("items__variant__product")


class MyQuoteDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = QuoteSerializer
    lookup_field = "reference"

    def get_queryset(self):
        return QuoteRequest.objects.filter(customer=self.request.user).prefetch_related("items")


def _quote_from_token(reference, token):
    if not isinstance(reference, str) or not isinstance(token, str) or not token:
        return None
    quote = QuoteRequest.objects.filter(reference=reference).select_related("order").first()
    if quote and quote.public_token and hmac.compare_digest(quote.public_token, token):
        return quote
    return None


class PublicQuoteView(APIView):
    """GET /api/v1/quotes/view/?ref=…&token=… : le devis, pour le lien envoyé par e-mail."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        quote = _quote_from_token(request.query_params.get("ref"), request.query_params.get("token"))
        if quote is None:
            return Response({"detail": _("Devis introuvable.")}, status=status.HTTP_404_NOT_FOUND)
        return Response({**PublicQuoteSerializer(quote).data, "payment_methods": payment_methods_for_quote()})


class AcceptQuoteView(APIView):
    """POST /api/v1/quotes/accept/ {reference, token, payment_method, shipping_address}"""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        quote = _quote_from_token(request.data.get("reference"), request.data.get("token"))
        if quote is None:
            return Response({"detail": _("Devis introuvable.")}, status=status.HTTP_404_NOT_FOUND)
        raw = request.data.get("shipping_address")
        if not isinstance(raw, dict):
            return Response({"detail": _("Adresse de livraison invalide.")}, status=status.HTTP_400_BAD_REQUEST)
        address = {key: raw.get(key) for key in ADDRESS_FIELDS if raw.get(key) not in (None, "")}
        if any(not isinstance(v, str) or len(v) > 200 for v in address.values()):
            return Response({"detail": _("Adresse de livraison invalide.")}, status=status.HTTP_400_BAD_REQUEST)
        address["country"] = normalize_country(address.get("country"))
        if not all(address.get(key) for key in ("full_name", "address", "city", "country")):
            return Response({"detail": _("Adresse de livraison incomplète.")}, status=status.HTTP_400_BAD_REQUEST)
        try:
            order = accept_quote(quote, request.data.get("payment_method"), address)
        except QuoteError as exc:
            return _quote_error(exc)
        return Response({"order": OrderSerializer(order).data, "payment_token": order.public_token},
                        status=status.HTTP_201_CREATED)


class AdminQuoteViewSet(viewsets.ModelViewSet):
    """Gestion des devis côté back-office (section B2B)."""

    permission_classes = [HasStaffSection]
    required_section = "b2b"
    serializer_class = AdminQuoteSerializer
    queryset = QuoteRequest.objects.prefetch_related("items__variant__product").select_related("order", "customer")
    filterset_fields = ["status"]
    search_fields = ["reference", "company", "contact_email"]
    http_method_names = ["get", "patch", "post", "head", "options"]

    def create(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        """{items: [{id, unit_price}], shipping_cost, valid_until?} : chiffre et envoie le devis."""
        quote = self.get_object()
        raw_items = request.data.get("items")
        if not isinstance(raw_items, list):
            return _quote_error(QuoteError("missing_prices"))
        prices = {}
        for raw in raw_items:
            price = _money(raw.get("unit_price")) if isinstance(raw, dict) else False
            if price is False or price is None or not isinstance(raw.get("id"), int):
                return Response({"detail": _("Montant invalide.")}, status=status.HTTP_400_BAD_REQUEST)
            prices[raw["id"]] = price
        shipping = _money(request.data.get("shipping_cost", "0"))
        if shipping is False:
            return Response({"detail": _("Montant invalide.")}, status=status.HTTP_400_BAD_REQUEST)
        valid_until = request.data.get("valid_until")
        if valid_until:
            try:
                valid_until = date.fromisoformat(valid_until)
            except (TypeError, ValueError):
                return Response({"detail": _("Date invalide.")}, status=status.HTTP_400_BAD_REQUEST)
            if valid_until < date.today():
                return Response({"detail": _("Date invalide.")}, status=status.HTTP_400_BAD_REQUEST)
        try:
            quote = send_quote(quote, prices, shipping, valid_until or None)
        except QuoteError as exc:
            return _quote_error(exc)
        return Response(self.get_serializer(quote).data)
