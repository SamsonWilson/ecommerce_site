"""
Virement bancaire (T/T) : rien n'est automatique.

Le client reçoit les coordonnées et la référence à indiquer ; les articles
lui sont réservés quelques jours ; un employé habilité enregistre le
virement à sa réception, ce qui fait passer la commande en « payée ».
"""
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from accounts.models import CustomerProfile
from orders.models import Order

from .models import Payment

CODE = "transfer"


def bank_details():
    """Coordonnées à afficher au client, ou None si le virement n'est pas configuré."""
    details = {
        "holder": settings.BANK_TRANSFER_HOLDER,
        "bank": settings.BANK_TRANSFER_BANK,
        "account": settings.BANK_TRANSFER_ACCOUNT,
        "bic": settings.BANK_TRANSFER_BIC,
        "bank_address": settings.BANK_TRANSFER_BANK_ADDRESS,
    }
    if not (details["holder"] and details["account"] and details["bic"]):
        return None
    return details


def is_approved_wholesaler(user):
    profile = getattr(user, "profile", None) if user and user.is_authenticated else None
    return bool(
        profile
        and profile.account_type == CustomerProfile.AccountType.WHOLESALE
        and profile.status == CustomerProfile.Status.APPROVED
    )


def transfer_allowed(user):
    """Au panier : réservé aux grossistes validés. (Un devis accepté y a toujours droit.)"""
    return bank_details() is not None and is_approved_wholesaler(user)


def new_deadline():
    return timezone.now() + timedelta(days=settings.BANK_TRANSFER_DAYS)


def amount_received(order):
    total = order.payments.filter(provider=CODE, status=Payment.Status.SUCCEEDED).aggregate(s=Sum("amount"))["s"]
    return total or Decimal("0.00")


def instructions(order):
    """Ce que le client doit virer, ou None si rien n'est attendu."""
    details = bank_details()
    if order.payment_method != CODE or order.status != Order.Status.PENDING or details is None:
        return None
    return {
        **details,
        "reference": order.reference,
        "amount_due": str(max(order.total_amount - amount_received(order), Decimal("0.00"))),
        "currency": order.currency,
        "deadline": order.payment_deadline,
    }


class TransferError(Exception):
    pass


def record_transfer(order, amount, bank_reference="", settle=False, user=None):
    """
    Enregistre un virement reçu. La commande passe « payée » quand le total est
    couvert, ou plus tôt si `settle` (frais bancaires déduits, par exemple).
    Renvoie True si la commande vient d'être réglée.
    """
    from orders.views import deduct_order_stock
    from .emails import send_order_confirmation

    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        if order.payment_method != CODE or order.status != Order.Status.PENDING:
            raise TransferError("not_pending")
        try:
            with transaction.atomic():
                Payment.objects.create(
                    order=order, provider=CODE, provider_reference=bank_reference[:100],
                    amount=amount, currency=order.currency, status=Payment.Status.SUCCEEDED,
                    paid_at=timezone.now(),
                    details={"recorded_by": user.email if user else "", "settled_short": False},
                )
        except IntegrityError as exc:
            raise TransferError("duplicate") from exc
        received = amount_received(order)
        if received < order.total_amount and not settle:
            return False
        if received < order.total_amount:
            last = order.payments.filter(provider=CODE).order_by("-created_at").first()
            last.details = {**last.details, "settled_short": True, "shortfall": str(order.total_amount - received)}
            last.save(update_fields=["details", "updated_at"])
        order.status = Order.Status.PAID
        order.save(update_fields=["status", "updated_at"])
        deduct_order_stock(order)  # déjà réservé : sans effet, sauf réservation tombée
        transaction.on_commit(lambda: send_order_confirmation(order.pk))
        return True


def expire_unpaid_transfers(now=None, dry_run=False):
    """Annule les virements non reçus à l'échéance et rend le stock. Renvoie les références."""
    from orders.views import restore_order_stock

    now = now or timezone.now()
    expired = []
    candidates = Order.objects.filter(
        status=Order.Status.PENDING, payment_method=CODE, payment_deadline__lt=now,
    )
    for order in candidates:
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)
            # Un virement partiel est arrivé : un humain décide.
            if order.status != Order.Status.PENDING or amount_received(order) > 0:
                continue
            expired.append(order.reference)
            if dry_run:
                continue
            order.status = Order.Status.CANCELLED
            order.save(update_fields=["status", "updated_at"])
            restore_order_stock(order)
    return expired
