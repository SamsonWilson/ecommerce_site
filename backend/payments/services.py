"""
Règles de paiement, communes à tous les prestataires.

- Le montant vient de la commande, calculée par le serveur.
- Une commande ne passe « payée » que si le prestataire confirme le bon montant
  dans la bonne devise. Le stock est retiré à ce moment-là.
- Chaque changement ne va que vers l'avant : un événement en retard ou rejoué
  ne défait jamais un paiement réussi.
"""
import logging
from datetime import timedelta
from decimal import Decimal
from urllib.parse import urlencode

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from django.utils.translation import gettext as _

from orders.models import Order
from orders.views import deduct_order_stock, restore_order_stock

from .emails import send_order_confirmation
from .models import Payment, Refund
from .providers import get_provider
from .providers.base import ProviderError

logger = logging.getLogger(__name__)

SYNC_INTERVAL = timedelta(seconds=3)


class RefundError(Exception):
    pass


def return_urls(order):
    query = urlencode({"ref": order.reference, "token": order.public_token})
    base = f"{settings.FRONTEND_URL.rstrip('/')}/commande/paiement?{query}"
    return base, f"{base}&cancelled=1"


def missing_stock(order):
    """Premier article dont le stock ne couvre plus la commande, sinon None."""
    for item in order.items.select_related("variant__product"):
        if item.variant.stock < item.quantity:
            return item
    return None


def start_payment(order, provider):
    """Nouvelle tentative de paiement : renvoie les paramètres de redirection."""
    payment = Payment.objects.create(
        order=order, provider=provider.code, amount=order.total_amount, currency=order.currency,
    )
    success_url, cancel_url = return_urls(order)
    try:
        reference, client = provider.create(payment, order, success_url=success_url, cancel_url=cancel_url)
    except ProviderError:
        payment.status = Payment.Status.FAILED
        payment.save(update_fields=["status", "updated_at"])
        logger.exception("Création du paiement %s impossible pour %s", provider.code, order.reference)
        raise
    payment.provider_reference = reference
    payment.status = Payment.Status.PENDING
    payment.save(update_fields=["provider_reference", "status", "updated_at"])
    return client


def apply_provider_state(payment, state):
    """Reporte l'état lu chez le prestataire sur le paiement et la commande."""
    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        order = Order.objects.select_for_update().get(pk=payment.order_id)
        payment.details = {
            **payment.details,
            "provider_status": state.raw_status,
            "provider_amount": str(state.amount),
            "provider_currency": state.currency,
        }
        payment.last_synced_at = timezone.now()

        if state.status == Payment.Status.SUCCEEDED and payment.status in Payment.OPEN:
            if state.amount != payment.amount or state.currency != payment.currency or payment.amount != order.total_amount:
                payment.status = Payment.Status.MISMATCH
                logger.error(
                    "Paiement %s de %s : %s %s reçus, %s %s attendus. Commande non validée.",
                    payment.provider_reference, order.reference, state.amount, state.currency,
                    order.total_amount, order.currency,
                )
            else:
                payment.status = Payment.Status.SUCCEEDED
                payment.paid_at = timezone.now()
                if order.status == Order.Status.PENDING:
                    order.status = Order.Status.PAID
                    order.save(update_fields=["status", "updated_at"])
                    deduct_order_stock(order)
                    transaction.on_commit(lambda: send_order_confirmation(order.pk))
                else:
                    # Commande annulée entre-temps, ou déjà réglée par une autre tentative.
                    payment.details["attention"] = f"order_{order.status.lower()}"
                    logger.warning("Paiement reçu pour %s, déjà %s : à rembourser ?", order.reference, order.status)
        elif state.status == Payment.Status.CANCELLED and payment.status in Payment.OPEN:
            payment.status = Payment.Status.CANCELLED
        elif state.status == Payment.Status.PENDING and payment.status == Payment.Status.CREATED:
            payment.status = Payment.Status.PENDING
        payment.save()
        return payment


def sync_payment(payment):
    """Relit un paiement en attente chez le prestataire (retour du client, webhook en retard)."""
    if payment.status not in Payment.OPEN or not payment.provider_reference:
        return payment
    if payment.last_synced_at and timezone.now() - payment.last_synced_at < SYNC_INTERVAL:
        return payment
    provider = get_provider(payment.provider)
    if provider is None:
        return payment
    try:
        state = provider.retrieve(payment.provider_reference)
    except ProviderError:
        logger.warning("Relecture du paiement %s impossible", payment.provider_reference)
        return payment
    return apply_provider_state(payment, state)


def handle_webhook(provider, payload):
    if payload.payment:
        payment = Payment.objects.filter(
            provider=provider.code, provider_reference=payload.payment.reference,
        ).first()
        if payment:
            apply_provider_state(payment, payload.payment)
        else:
            logger.info("Webhook %s : paiement %s inconnu", payload.name, payload.payment.reference)
    elif payload.refund_reference and payload.refund_status:
        refund = Refund.objects.filter(
            payment__provider=provider.code, provider_reference=payload.refund_reference,
        ).first()
        if refund:
            _set_refund_status(refund, payload.refund_status)


# --- Remboursements ---

def refund_payment(payment, amount=None, reason="", user=None):
    """Rembourse tout ou partie d'un paiement réussi, chez le prestataire."""
    provider = get_provider(payment.provider)
    if provider is None:
        raise RefundError(_("Le prestataire de ce paiement n'est plus configuré."))
    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        remaining = payment.refundable_amount
        amount = remaining if amount is None else amount
        if amount <= 0 or amount > remaining:
            raise RefundError(_("Montant remboursable : %(amount)s %(currency)s.") % {"amount": remaining, "currency": payment.currency})
        # Compté tout de suite : deux demandes simultanées ne dépassent pas le montant payé.
        refund = Refund.objects.create(payment=payment, amount=amount, reason=reason[:128], created_by=user)
        payment.recompute_refunds()
        payment.save()

    try:
        reference, status = provider.refund(payment, refund)
    except ProviderError:
        _set_refund_status(refund, Refund.Status.FAILED)
        raise
    refund.provider_reference = reference
    refund.save(update_fields=["provider_reference", "updated_at"])
    _set_refund_status(refund, status)
    return refund


def _set_refund_status(refund, status):
    with transaction.atomic():
        refund = Refund.objects.select_for_update().get(pk=refund.pk)
        if refund.status == Refund.Status.FAILED and status != Refund.Status.FAILED:
            return
        refund.status = status
        refund.save(update_fields=["status", "updated_at"])
        payment = Payment.objects.select_for_update().get(pk=refund.payment_id)
        payment.recompute_refunds()
        payment.save()
        _update_order_after_refund(payment.order_id)
        if status == Refund.Status.FAILED:
            logger.error("Remboursement refusé : %s", refund)


def _update_order_after_refund(order_id):
    """Commande entièrement remboursée : statut « remboursée », stock rendu s'il n'est pas parti."""
    order = Order.objects.select_for_update().get(pk=order_id)
    captured = order.payments.filter(status__in=Payment.CAPTURED).exclude(status=Payment.Status.MISMATCH)
    totals = captured.aggregate(paid=Sum("amount"), refunded=Sum("refunded_amount"))
    paid, refunded = totals["paid"] or Decimal("0"), totals["refunded"] or Decimal("0")
    if paid > 0 and refunded >= paid and order.status in (
        Order.Status.PAID, Order.Status.PREPARING, Order.Status.SHIPPED,
        Order.Status.DELIVERED, Order.Status.CANCELLED,
    ):
        if order.status in (Order.Status.PAID, Order.Status.PREPARING):
            restore_order_stock(order)
        order.status = Order.Status.REFUNDED
        order.save(update_fields=["status", "updated_at"])


def payment_alert(order):
    """Situation qu'un employé doit regarder, ou None."""
    payments = list(order.payments.all())
    if any(p.status == Payment.Status.MISMATCH for p in payments):
        return "mismatch"
    if any(p.details.get("attention") and p.refundable_amount > 0 for p in payments):
        return "paid_twice_or_after_cancel"
    return None
