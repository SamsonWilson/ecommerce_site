"""Ce que chaque prestataire de paiement doit savoir faire."""
from dataclasses import dataclass, field
from decimal import Decimal


class ProviderError(Exception):
    """Le prestataire a refusé la demande ou ne répond pas."""

    def __init__(self, message, code=""):
        super().__init__(message)
        self.code = code


class InvalidSignature(Exception):
    """Webhook non signé par le prestataire : à rejeter."""


@dataclass
class PaymentState:
    """État d'un paiement chez le prestataire, traduit dans nos statuts."""

    reference: str
    status: str          # un Payment.Status
    amount: Decimal
    currency: str
    raw_status: str = ""


@dataclass
class WebhookPayload:
    event_id: str
    name: str
    payment: PaymentState | None = None   # événement de paiement
    refund_reference: str = ""            # événement de remboursement
    refund_status: str = ""
    raw: dict = field(default_factory=dict)


class PaymentProvider:
    code = ""

    def is_configured(self):
        raise NotImplementedError

    def public_config(self):
        """Ce que le navigateur peut savoir (jamais de clé)."""
        return {}

    def create(self, payment, order, *, success_url, cancel_url):
        """Crée le paiement chez le prestataire. Renvoie (référence, paramètres pour le navigateur)."""
        raise NotImplementedError

    def retrieve(self, reference):
        """Relit l'état d'un paiement chez le prestataire : renvoie un PaymentState."""
        raise NotImplementedError

    def refund(self, payment, refund):
        """Demande un remboursement. Renvoie (référence, statut Refund.Status)."""
        raise NotImplementedError

    def parse_webhook(self, request):
        """Vérifie la signature et décode l'événement. Lève InvalidSignature sinon."""
        raise NotImplementedError
