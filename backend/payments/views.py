import hmac
import logging

from django.conf import settings
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext as _
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import StaffProfile
from accounts.permissions import staff_sections
from core.translator import current_language
from orders.models import Order
from orders.serializers import OrderSerializer

from .models import Payment, WebhookEvent
from .providers import configured_providers, get_provider
from .providers.base import InvalidSignature, ProviderError
from .services import RefundError, handle_webhook, missing_stock, refund_payment, start_payment, sync_payment
from .transfer import TransferError, record_transfer, transfer_allowed

logger = logging.getLogger(__name__)


def _order_from_token(reference, token):
    """La commande, si le jeton secret remis au client correspond."""
    if not isinstance(reference, str) or not isinstance(token, str) or not token:
        return None
    order = Order.objects.filter(reference=reference).first()
    if order and order.public_token and hmac.compare_digest(order.public_token, token):
        return order
    return None


def _no_payment_in_progress(payment):
    """
    Réessayer n'est proposé que si rien n'est en cours chez le prestataire :
    un virement ou une validation bancaire en attente donnerait un double débit.
    """
    if payment is None or payment.status not in Payment.OPEN:
        return True
    return payment.details.get("provider_status", "") in ("", "REQUIRES_PAYMENT_METHOD")


def _not_found():
    return Response({"detail": _("Commande introuvable.")}, status=status.HTTP_404_NOT_FOUND)


class PaymentConfigView(APIView):
    """GET /api/v1/payments/config/ : moyens de paiement proposés en ligne."""

    permission_classes = [AllowAny]

    def get(self, request):
        codes = configured_providers()
        transfer = transfer_allowed(request.user)
        return Response({
            "methods": ["cod", *codes, *(["transfer"] if transfer else [])],
            "providers": {code: get_provider(code).public_config() for code in codes},
            "transfer_days": settings.BANK_TRANSFER_DAYS if transfer else None,
        })


class StartPaymentView(APIView):
    """POST /api/v1/payments/start/ {reference, token} : ouvre une tentative de paiement."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        order = _order_from_token(request.data.get("reference"), request.data.get("token"))
        if order is None:
            return _not_found()
        if order.status != Order.Status.PENDING:
            return Response({"detail": _("Cette commande n'est plus en attente de paiement.")}, status=status.HTTP_400_BAD_REQUEST)
        provider = get_provider(order.payment_method)
        if provider is None:
            return Response({"detail": _("Le paiement en ligne n'est pas disponible pour le moment.")}, status=status.HTTP_400_BAD_REQUEST)
        item = missing_stock(order)
        if item:
            return Response({"detail": _("Stock insuffisant pour %(name)s (Disponible : %(stock)s).") % {
                "name": item.variant.product.translated("name"), "stock": item.variant.stock,
            }}, status=status.HTTP_400_BAD_REQUEST)
        try:
            client = start_payment(order, provider)
        except ProviderError:
            return Response(
                {"detail": _("Le service de paiement ne répond pas. Veuillez réessayer dans quelques instants.")},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        country = order.shipping_address.get("country") if isinstance(order.shipping_address, dict) else None
        return Response({"provider": provider.code, "locale": current_language(), "country_code": country, **client})


class PaymentStatusView(APIView):
    """GET /api/v1/payments/status/?ref=…&token=… : état réel, relu chez le prestataire si besoin."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        order = _order_from_token(request.query_params.get("ref"), request.query_params.get("token"))
        if order is None:
            return _not_found()
        payment = order.payments.first()
        if payment:
            payment = sync_payment(payment)
            order.refresh_from_db()
        return Response({
            "order": OrderSerializer(order).data,
            "payment_status": payment.status if payment else None,
            "can_retry": (
                order.status == Order.Status.PENDING
                and get_provider(order.payment_method) is not None
                and _no_payment_in_progress(payment)
            ),
        })


class AirwallexWebhookView(APIView):
    """POST /api/v1/webhooks/airwallex/ : seule source de vérité pour « payée »."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        provider = get_provider("airwallex")
        if provider is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        try:
            payload = provider.parse_webhook(request)
        except InvalidSignature:
            logger.warning("Webhook Airwallex rejeté : signature invalide")
            return Response({"detail": "Signature invalide."}, status=status.HTTP_400_BAD_REQUEST)

        # Une erreur annule aussi l'enregistrement de l'événement : Airwallex le renverra.
        with transaction.atomic():
            _, created = WebhookEvent.objects.get_or_create(
                provider=provider.code, event_id=payload.event_id,
                defaults={"name": payload.name, "payload": {
                    "object_id": payload.payment.reference if payload.payment else payload.refund_reference,
                    "status": payload.payment.raw_status if payload.payment else payload.refund_status,
                }},
            )
            if created:
                handle_webhook(provider, payload)
        return Response({"received": True})


def can_refund(user):
    """Rendre de l'argent : administrateurs et responsables boutique seulement."""
    if "orders" not in staff_sections(user):
        return False
    profile = getattr(user, "staff_profile", None)
    return user.is_superuser or profile is None or profile.role in (StaffProfile.Role.ADMIN, StaffProfile.Role.MANAGER)


class AdminRefundView(APIView):
    """POST /api/v1/admin/orders/{pk}/refund/ {amount?, reason?, payment_id?}"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not can_refund(request.user):
            return Response({"detail": _("Seuls un administrateur ou un responsable peuvent rembourser.")}, status=status.HTTP_403_FORBIDDEN)
        order = get_object_or_404(Order, pk=pk)
        payments = order.payments.filter(provider__in=configured_providers(), status__in=(
            Payment.Status.SUCCEEDED, Payment.Status.PARTIALLY_REFUNDED, Payment.Status.MISMATCH,
        ))
        payment_id = request.data.get("payment_id")
        if payment_id is not None:
            payments = payments.filter(pk=payment_id)
        payment = max(payments, key=lambda p: p.refundable_amount, default=None)
        if payment is None or payment.refundable_amount <= 0:
            return Response({"detail": _("Aucun paiement en ligne à rembourser.")}, status=status.HTTP_400_BAD_REQUEST)

        amount = request.data.get("amount")
        if amount in (None, ""):
            amount = None
        else:
            try:
                amount = Decimal(str(amount)).quantize(Decimal("0.01"))
            except (InvalidOperation, ValueError):
                return Response({"detail": _("Montant invalide.")}, status=status.HTTP_400_BAD_REQUEST)
        reason = request.data.get("reason") or ""
        if not isinstance(reason, str):
            return Response({"detail": _("Motif invalide.")}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refund_payment(payment, amount, reason, request.user)
        except RefundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ProviderError:
            return Response(
                {"detail": _("Le prestataire a refusé le remboursement. Rien n'a été remboursé.")},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        order.refresh_from_db()
        return Response(OrderSerializer(order).data)


class AdminRecordTransferView(APIView):
    """POST /api/v1/admin/orders/{pk}/record-transfer/ {amount, bank_reference?, settle?}"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not can_refund(request.user):
            return Response({"detail": _("Seuls un administrateur ou un responsable peuvent enregistrer un virement.")}, status=status.HTTP_403_FORBIDDEN)
        order = get_object_or_404(Order, pk=pk)
        try:
            amount = Decimal(str(request.data.get("amount"))).quantize(Decimal("0.01"))
        except (InvalidOperation, ValueError):
            amount = None
        if amount is None or amount <= 0:
            return Response({"detail": _("Montant invalide.")}, status=status.HTTP_400_BAD_REQUEST)
        bank_reference = request.data.get("bank_reference") or ""
        settle = request.data.get("settle") in (True, "true", "1", 1)
        if not isinstance(bank_reference, str):
            return Response({"detail": _("Référence invalide.")}, status=status.HTTP_400_BAD_REQUEST)
        try:
            record_transfer(order, amount, bank_reference.strip(), settle=settle, user=request.user)
        except TransferError as exc:
            message = (
                _("Ce virement est déjà enregistré.") if str(exc) == "duplicate"
                else _("Cette commande n'attend pas de virement.")
            )
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        return Response(OrderSerializer(order).data)
