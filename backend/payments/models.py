"""
Paiements en ligne.

Une commande peut avoir plusieurs tentatives de paiement (le client abandonne
puis réessaie). Seul le prestataire dit si une tentative a réussi : par un
webhook signé, ou par une relecture côté serveur. Jamais le navigateur.
"""
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Q, Sum

from orders.models import Order


class Payment(models.Model):
    class Status(models.TextChoices):
        CREATED = "CREATED", "Créé"
        PENDING = "PENDING", "En attente du client"
        SUCCEEDED = "SUCCEEDED", "Payé"
        CANCELLED = "CANCELLED", "Annulé"
        FAILED = "FAILED", "Échec de création"
        PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED", "Remboursé en partie"
        REFUNDED = "REFUNDED", "Remboursé"
        # Payé chez le prestataire, mais pas le montant ou la devise attendus :
        # la commande n'est pas validée, un employé doit regarder.
        MISMATCH = "MISMATCH", "Montant incohérent"

    OPEN = (Status.CREATED, Status.PENDING)
    CAPTURED = (Status.SUCCEEDED, Status.PARTIALLY_REFUNDED, Status.REFUNDED, Status.MISMATCH)

    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="payments")
    provider = models.CharField(max_length=20)
    provider_reference = models.CharField(max_length=100, blank=True, db_index=True)
    # Clé d'idempotence envoyée au prestataire : un nouvel essai = une nouvelle clé.
    request_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)
    refunded_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    # Dernier état connu chez le prestataire (statut brut, montant), sans secret.
    details = models.JSONField(default=dict, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("provider", "provider_reference"),
                condition=~Q(provider_reference=""),
                name="payment_unique_provider_reference",
            ),
        ]

    def __str__(self):
        return f"{self.order.reference} · {self.provider} · {self.status}"

    @property
    def refundable_amount(self):
        if self.status not in (self.Status.SUCCEEDED, self.Status.PARTIALLY_REFUNDED, self.Status.MISMATCH):
            return Decimal("0.00")
        return self.amount - self.refunded_amount

    def recompute_refunds(self):
        """Montant remboursé = remboursements non refusés ; met le statut à jour."""
        total = self.refunds.exclude(status=Refund.Status.FAILED).aggregate(s=Sum("amount"))["s"] or Decimal("0.00")
        self.refunded_amount = total
        if self.status in (self.Status.SUCCEEDED, self.Status.PARTIALLY_REFUNDED, self.Status.REFUNDED):
            if total >= self.amount:
                self.status = self.Status.REFUNDED
            elif total > 0:
                self.status = self.Status.PARTIALLY_REFUNDED
            else:
                self.status = self.Status.SUCCEEDED


class Refund(models.Model):
    class Status(models.TextChoices):
        CREATED = "CREATED", "Demandé"
        RECEIVED = "RECEIVED", "Reçu par le prestataire"
        ACCEPTED = "ACCEPTED", "Accepté"
        SETTLED = "SETTLED", "Réglé"
        FAILED = "FAILED", "Refusé"

    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name="refunds")
    provider_reference = models.CharField(max_length=100, blank=True, db_index=True)
    request_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.CharField(max_length=128, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.CREATED)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.payment.order.reference} · -{self.amount} · {self.status}"


class WebhookEvent(models.Model):
    """Événements déjà traités : un même événement renvoyé n'agit qu'une fois."""

    provider = models.CharField(max_length=20)
    event_id = models.CharField(max_length=100)
    name = models.CharField(max_length=80)
    payload = models.JSONField(default=dict)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-received_at",)
        constraints = [
            models.UniqueConstraint(fields=("provider", "event_id"), name="webhook_event_unique"),
        ]

    def __str__(self):
        return f"{self.provider} · {self.name} · {self.event_id}"
