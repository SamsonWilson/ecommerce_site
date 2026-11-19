"""
Airwallex : PaymentIntent créé par le serveur, puis page de paiement hébergée.

Références (documentation officielle, consultée le 2026-11-10) :
- POST /api/v1/authentication/login (en-têtes x-client-id, x-api-key) -> token, expires_at
- POST /api/v1/pa/payment_intents/create : request_id, amount, currency, merchant_order_id, return_url
- GET  /api/v1/pa/payment_intents/{id}
- POST /api/v1/pa/refunds/create : request_id, payment_intent_id, amount, reason
- Webhook : x-signature = HMAC-SHA256(secret, x-timestamp + corps brut), en hexadécimal
"""
import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.core.cache import cache

from ..models import Payment, Refund
from .base import InvalidSignature, PaymentProvider, PaymentState, ProviderError, WebhookPayload

logger = logging.getLogger(__name__)

TIMEOUT = 20

# La liste officielle « n'est pas exhaustive » : un statut inconnu reste en attente.
INTENT_STATUS = {
    "SUCCEEDED": Payment.Status.SUCCEEDED,
    "CANCELLED": Payment.Status.CANCELLED,
    "REQUIRES_PAYMENT_METHOD": Payment.Status.PENDING,
    "REQUIRES_CUSTOMER_ACTION": Payment.Status.PENDING,
    "REQUIRES_CAPTURE": Payment.Status.PENDING,
    "PENDING_REVIEW": Payment.Status.PENDING,
    "PENDING": Payment.Status.PENDING,
}

REFUND_STATUS = {
    "RECEIVED": Refund.Status.RECEIVED,
    "ACCEPTED": Refund.Status.ACCEPTED,
    "SETTLED": Refund.Status.SETTLED,
    "FAILED": Refund.Status.FAILED,
}


def _decimal(value):
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError):
        return None


class AirwallexProvider(PaymentProvider):
    code = "airwallex"

    def __init__(self):
        self.client_id = settings.AIRWALLEX_CLIENT_ID
        self.api_key = settings.AIRWALLEX_API_KEY
        self.webhook_secret = settings.AIRWALLEX_WEBHOOK_SECRET
        self.env = settings.AIRWALLEX_ENV
        self.base = settings.AIRWALLEX_API_BASE.rstrip("/")

    def is_configured(self):
        # Sans secret de webhook, un paiement réussi ne pourrait pas être confirmé.
        return bool(self.client_id and self.api_key and self.webhook_secret)

    def public_config(self):
        return {"env": self.env}

    # --- Appels à l'API ---

    def _cache_key(self):
        return "airwallex-token:" + hashlib.sha256(f"{self.base}|{self.client_id}".encode()).hexdigest()[:16]

    def _token(self):
        token = cache.get(self._cache_key())
        if token:
            return token
        try:
            response = requests.post(
                f"{self.base}/api/v1/authentication/login",
                headers={"x-client-id": self.client_id, "x-api-key": self.api_key, "Content-Type": "application/json"},
                timeout=TIMEOUT,
            )
        except requests.RequestException as exc:
            raise ProviderError("Airwallex injoignable.") from exc
        if response.status_code >= 400:
            # Jamais la réponse brute dans les journaux : elle peut citer les identifiants.
            raise ProviderError(f"Connexion Airwallex refusée ({response.status_code}).", "unauthorized")
        data = response.json()
        lifetime = 20 * 60
        try:
            expires = datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00"))
            lifetime = int((expires - datetime.now(timezone.utc)).total_seconds()) - 60
        except (KeyError, ValueError, AttributeError, TypeError):
            pass
        token = data["token"]
        cache.set(self._cache_key(), token, max(60, min(lifetime, 25 * 60)))
        return token

    def _call(self, method, path, payload=None, retry=True):
        try:
            response = requests.request(
                method, f"{self.base}{path}", json=payload, timeout=TIMEOUT,
                headers={"Authorization": f"Bearer {self._token()}", "Content-Type": "application/json"},
            )
        except requests.RequestException as exc:
            raise ProviderError("Airwallex injoignable.") from exc
        if response.status_code == 401 and retry:
            cache.delete(self._cache_key())
            return self._call(method, path, payload, retry=False)
        try:
            data = response.json()
        except ValueError:
            data = {}
        if response.status_code >= 400:
            code = data.get("code", "") if isinstance(data, dict) else ""
            raise ProviderError(f"Airwallex a refusé la demande ({response.status_code} {code}).", code)
        return data

    # --- Paiement ---

    def create(self, payment, order, *, success_url, cancel_url):
        data = self._call("POST", "/api/v1/pa/payment_intents/create", {
            "request_id": str(payment.request_id),
            "amount": float(payment.amount),
            "currency": payment.currency,
            "merchant_order_id": order.reference,
            "return_url": success_url,
            "metadata": {"order_reference": order.reference, "payment_id": str(payment.pk)},
        })
        intent_id, client_secret = data.get("id"), data.get("client_secret")
        if not intent_id or not client_secret:
            raise ProviderError("Réponse Airwallex incomplète.")
        amount = _decimal(data.get("amount"))
        if amount != payment.amount or data.get("currency") != payment.currency:
            raise ProviderError("Airwallex a enregistré un autre montant.")
        return intent_id, {
            "intent_id": intent_id,
            "client_secret": client_secret,
            "currency": payment.currency,
            "env": self.env,
            "success_url": success_url,
            "cancel_url": cancel_url,
        }

    def _state(self, obj):
        raw = str(obj.get("status", ""))
        return PaymentState(
            reference=str(obj.get("id", "")),
            status=INTENT_STATUS.get(raw, Payment.Status.PENDING),
            amount=_decimal(obj.get("amount")),
            currency=str(obj.get("currency", "")),
            raw_status=raw,
        )

    def retrieve(self, reference):
        return self._state(self._call("GET", f"/api/v1/pa/payment_intents/{reference}"))

    def refund(self, payment, refund):
        data = self._call("POST", "/api/v1/pa/refunds/create", {
            "request_id": str(refund.request_id),
            "payment_intent_id": payment.provider_reference,
            "amount": float(refund.amount),
            "reason": refund.reason[:128] or "Remboursement",
        })
        return str(data.get("id", "")), REFUND_STATUS.get(data.get("status"), Refund.Status.RECEIVED)

    # --- Webhook ---

    def parse_webhook(self, request):
        timestamp = request.headers.get("x-timestamp", "")
        signature = request.headers.get("x-signature", "")
        body = request.body
        expected = hmac.new(
            self.webhook_secret.encode(), timestamp.encode() + body, hashlib.sha256,
        ).hexdigest()
        if not timestamp or not signature or not hmac.compare_digest(expected, signature):
            raise InvalidSignature()
        try:
            event = json.loads(body)
            obj = event["data"]["object"]
            payload = WebhookPayload(event_id=str(event["id"]), name=str(event["name"]), raw=event)
        except (ValueError, KeyError, TypeError) as exc:
            raise InvalidSignature() from exc
        if payload.name.startswith("payment_intent."):
            payload.payment = self._state(obj)
        elif payload.name.startswith("refund."):
            payload.refund_reference = str(obj.get("id", ""))
            payload.refund_status = REFUND_STATUS.get(obj.get("status"), "")
        return payload
