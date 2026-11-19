import hashlib
import hmac
import json
from decimal import Decimal
from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import StaffProfile, User
from catalog.models import Product, ProductVariant
from orders.models import Order

from .models import Payment, Refund, WebhookEvent

SECRET = "whsec_test"
KEYS = dict(
    AIRWALLEX_CLIENT_ID="client", AIRWALLEX_API_KEY="key", AIRWALLEX_WEBHOOK_SECRET=SECRET,
    AIRWALLEX_ENV="sandbox", AIRWALLEX_API_BASE="https://api.sandbox.airwallex.com",
    FRONTEND_URL="https://boutique.test",
)


class FakeResponse:
    def __init__(self, status, data):
        self.status_code, self._data = status, data

    def json(self):
        return self._data


class FakeAirwallex:
    """Imite les réponses documentées d'Airwallex (intents, remboursements)."""

    def __init__(self):
        self.intents, self.refunds, self.calls, self.fail = {}, {}, [], None

    def post(self, url, headers=None, timeout=None, **kwargs):
        assert url.endswith("/api/v1/authentication/login") and headers["x-api-key"] == "key"
        return FakeResponse(200, {"token": "jeton", "expires_at": "2099-01-01T00:00:00Z"})

    def request(self, method, url, json=None, headers=None, timeout=None):
        assert headers["Authorization"] == "Bearer jeton"
        path = url.split("airwallex.com", 1)[1]
        self.calls.append((method, path, json))
        if self.fail:
            return FakeResponse(self.fail, {"code": "internal_error"})
        if path == "/api/v1/pa/payment_intents/create":
            intent_id = f"int_{len(self.intents) + 1}"
            self.intents[intent_id] = {
                "id": intent_id, "request_id": json["request_id"], "amount": json["amount"],
                "currency": json["currency"], "merchant_order_id": json["merchant_order_id"],
                "status": "REQUIRES_PAYMENT_METHOD", "client_secret": f"secret_{intent_id}",
            }
            return FakeResponse(201, self.intents[intent_id])
        if path.startswith("/api/v1/pa/payment_intents/"):
            return FakeResponse(200, self.intents[path.rsplit("/", 1)[1]])
        if path == "/api/v1/pa/refunds/create":
            refund_id = f"rfd_{len(self.refunds) + 1}"
            self.refunds[refund_id] = {**json, "id": refund_id, "status": "RECEIVED"}
            return FakeResponse(201, self.refunds[refund_id])
        return FakeResponse(404, {"code": "not_found"})


@override_settings(**KEYS)
class AirwallexPaymentTests(TestCase):
    def setUp(self):
        cache.clear()
        self.fake = FakeAirwallex()
        for name in ("post", "request"):
            patcher = mock.patch(f"payments.providers.airwallex.requests.{name}", getattr(self.fake, name))
            patcher.start()
            self.addCleanup(patcher.stop)
        self.client = APIClient()
        self.customer = User.objects.create_user(email="client@example.com", password="Password123!")
        product = Product.objects.create(name="Couronne", slug="couronne")
        self.variant = ProductVariant.objects.create(
            product=product, sku="COU-1", retail_price=Decimal("50.00"),
            wholesale_price=Decimal("30.00"), stock=10,
        )

    # --- Outils ---

    def checkout(self, payment_method="airwallex", quantity=2, **headers):
        self.client.force_authenticate(self.customer)
        response = self.client.post("/api/v1/checkout/", {
            "email": "client@example.com",
            "items": [{"slug": "couronne", "quantity": quantity}],
            "shipping_address": {"country": "FR", "city": "Paris"},
            "shipping_method": "standard", "payment_method": payment_method,
        }, format="json", **headers)
        self.client.force_authenticate(None)
        self.assertEqual(response.status_code, 201, response.content)
        return Order.objects.get(reference=response.data["order"]["reference"]), response.data["payment_token"]

    def start(self, order, token):
        return self.client.post("/api/v1/payments/start/", {"reference": order.reference, "token": token}, format="json")

    def paid_order(self):
        order, token = self.checkout()
        self.start(order, token)
        intent = self.fake.intents["int_1"]
        intent["status"] = "SUCCEEDED"
        with self.captureOnCommitCallbacks(execute=True):
            self.webhook("evt_paid", "payment_intent.succeeded", intent)
        order.refresh_from_db()
        return order

    def webhook(self, event_id, name, obj, secret=SECRET, timestamp="1762770000000"):
        body = json.dumps({"id": event_id, "name": name, "data": {"object": obj}, "account_id": "acc"})
        signature = hmac.new(secret.encode(), (timestamp + body).encode(), hashlib.sha256).hexdigest()
        return self.client.post(
            "/api/v1/webhooks/airwallex/", body, content_type="application/json",
            HTTP_X_TIMESTAMP=timestamp, HTTP_X_SIGNATURE=signature,
        )

    def stock(self):
        self.variant.refresh_from_db()
        return self.variant.stock

    def staff(self, role):
        user = User.objects.create_user(email=f"{role.lower()}@example.com", password="Password123!", is_staff=True)
        StaffProfile.objects.create(user=user, role=role)
        return user

    # --- Configuration ---

    def test_config_lists_airwallex_only_when_configured(self):
        self.assertEqual(self.client.get("/api/v1/payments/config/").data["methods"], ["cod", "airwallex"])
        with override_settings(AIRWALLEX_WEBHOOK_SECRET=""):
            self.assertEqual(self.client.get("/api/v1/payments/config/").data["methods"], ["cod"])
            self.client.force_authenticate(self.customer)
            response = self.client.post("/api/v1/checkout/", {
                "email": "client@example.com", "items": [{"slug": "couronne", "quantity": 1}],
                "shipping_address": {"country": "FR"}, "shipping_method": "standard", "payment_method": "airwallex",
            }, format="json")
            self.assertEqual(response.status_code, 400)

    def test_config_never_exposes_keys(self):
        body = json.dumps(self.client.get("/api/v1/payments/config/").data)
        self.assertNotIn("key", body.replace("keys", ""))
        self.assertNotIn(SECRET, body)

    def test_old_stripe_webhook_is_gone(self):
        self.assertEqual(self.client.post("/api/v1/webhooks/stripe/", {}, format="json").status_code, 404)

    # --- Démarrage ---

    def test_online_order_waits_for_payment(self):
        order, token = self.checkout()
        self.assertEqual(order.status, Order.Status.PENDING)
        self.assertEqual(order.total_amount, Decimal("106.90"))
        self.assertEqual(self.stock(), 10)
        self.assertGreaterEqual(len(token), 40)

    def test_start_sends_server_amount_and_returns_redirect(self):
        order, token = self.checkout()
        response = self.start(order, token)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["intent_id"], "int_1")
        self.assertEqual(response.data["client_secret"], "secret_int_1")
        self.assertEqual(response.data["env"], "sandbox")
        self.assertTrue(response.data["success_url"].startswith(
            f"https://boutique.test/commande/paiement?ref={order.reference}&token="))
        sent = self.fake.calls[0][2]
        self.assertEqual((sent["amount"], sent["currency"], sent["merchant_order_id"]), (106.9, "EUR", order.reference))
        payment = order.payments.get()
        self.assertEqual((payment.status, payment.provider_reference), (Payment.Status.PENDING, "int_1"))

    def test_each_attempt_has_its_own_idempotency_key(self):
        order, token = self.checkout()
        self.start(order, token)
        self.start(order, token)
        keys = {call[2]["request_id"] for call in self.fake.calls}
        self.assertEqual(len(keys), 2)

    def test_start_requires_the_secret_token(self):
        order, _ = self.checkout()
        for token in ("", "mauvais", None, ["x"]):
            self.assertEqual(self.start(order, token).status_code, 404)
        self.assertEqual(self.fake.calls, [])

    def test_start_refused_when_not_pending_or_out_of_stock(self):
        order, token = self.checkout()
        self.variant.stock = 1
        self.variant.save()
        self.assertEqual(self.start(order, token).status_code, 400)
        Order.objects.filter(pk=order.pk).update(status=Order.Status.CANCELLED)
        self.assertEqual(self.start(order, token).status_code, 400)
        self.assertEqual(self.fake.calls, [])

    def test_provider_failure_is_reported_and_nothing_is_paid(self):
        order, token = self.checkout()
        self.fake.fail = 500
        self.assertEqual(self.start(order, token).status_code, 502)
        self.assertEqual(order.payments.get().status, Payment.Status.FAILED)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PENDING)

    # --- Webhook ---

    def test_signed_webhook_marks_order_paid_once(self):
        order = self.paid_order()
        self.assertEqual(order.status, Order.Status.PAID)
        self.assertEqual(self.stock(), 8)
        self.assertEqual(order.payments.get().status, Payment.Status.SUCCEEDED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Votre paiement a bien été reçu.", mail.outbox[0].body)
        # Même événement renvoyé : rien ne bouge.
        response = self.webhook("evt_paid", "payment_intent.succeeded", self.fake.intents["int_1"])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.stock(), 8)
        self.assertEqual(WebhookEvent.objects.count(), 1)

    def test_forged_webhook_is_rejected(self):
        order, token = self.checkout()
        self.start(order, token)
        intent = {**self.fake.intents["int_1"], "status": "SUCCEEDED"}
        self.assertEqual(self.webhook("evt_1", "payment_intent.succeeded", intent, secret="faux").status_code, 400)
        response = self.client.post("/api/v1/webhooks/airwallex/", json.dumps({"id": "e", "name": "x", "data": {"object": intent}}),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PENDING)
        self.assertEqual(WebhookEvent.objects.count(), 0)

    def test_webhook_disabled_without_configuration(self):
        with override_settings(AIRWALLEX_WEBHOOK_SECRET=""):
            self.assertEqual(self.webhook("evt", "payment_intent.succeeded", {"id": "int_1"}).status_code, 404)

    def test_wrong_amount_does_not_validate_the_order(self):
        order, token = self.checkout()
        self.start(order, token)
        intent = {**self.fake.intents["int_1"], "status": "SUCCEEDED", "amount": 1.00}
        self.webhook("evt_1", "payment_intent.succeeded", intent)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PENDING)
        self.assertEqual(order.payments.get().status, Payment.Status.MISMATCH)
        self.assertEqual(self.stock(), 10)
        self.client.force_authenticate(self.staff(StaffProfile.Role.ADMIN))
        self.assertEqual(self.client.get(f"/api/v1/admin/orders/{order.pk}/").data["payment_alert"], "mismatch")

    def test_late_events_never_undo_a_payment(self):
        order = self.paid_order()
        stale = {**self.fake.intents["int_1"], "status": "REQUIRES_PAYMENT_METHOD"}
        self.webhook("evt_old", "payment_intent.requires_payment_method", stale)
        self.webhook("evt_cancel", "payment_intent.cancelled", {**stale, "status": "CANCELLED"})
        self.assertEqual(order.payments.get().status, Payment.Status.SUCCEEDED)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PAID)

    def test_payment_after_cancellation_is_flagged_not_applied(self):
        order, token = self.checkout()
        self.start(order, token)
        Order.objects.filter(pk=order.pk).update(status=Order.Status.CANCELLED)
        self.webhook("evt_1", "payment_intent.succeeded", {**self.fake.intents["int_1"], "status": "SUCCEEDED"})
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)
        self.assertEqual(self.stock(), 10)
        self.client.force_authenticate(self.staff(StaffProfile.Role.ADMIN))
        self.assertEqual(self.client.get(f"/api/v1/admin/orders/{order.pk}/").data["payment_alert"], "paid_twice_or_after_cancel")

    def test_unknown_intent_is_acknowledged(self):
        response = self.webhook("evt_x", "payment_intent.succeeded", {"id": "int_inconnu", "status": "SUCCEEDED", "amount": 1, "currency": "EUR"})
        self.assertEqual(response.status_code, 200)

    # --- Retour du client ---

    def test_status_page_reads_the_provider_without_webhook(self):
        order, token = self.checkout()
        self.start(order, token)
        url = f"/api/v1/payments/status/?ref={order.reference}&token={token}"
        response = self.client.get(url)
        self.assertEqual((response.data["order"]["status"], response.data["can_retry"]), ("PENDING", True))
        self.fake.intents["int_1"]["status"] = "SUCCEEDED"
        Payment.objects.update(last_synced_at=None)
        response = self.client.get(url)
        self.assertEqual(response.data["order"]["status"], "PAID")
        self.assertEqual(response.data["payment_status"], "SUCCEEDED")
        self.assertFalse(response.data["can_retry"])
        self.assertEqual(self.client.get(f"/api/v1/payments/status/?ref={order.reference}&token=faux").status_code, 404)

    def test_no_retry_while_the_bank_is_still_deciding(self):
        order, token = self.checkout()
        self.assertEqual(self.start(order, token).data["country_code"], "FR")
        self.fake.intents["int_1"]["status"] = "PENDING_REVIEW"
        response = self.client.get(f"/api/v1/payments/status/?ref={order.reference}&token={token}")
        self.assertEqual(response.data["order"]["status"], "PENDING")
        self.assertFalse(response.data["can_retry"])

    # --- Remboursements ---

    def refund(self, order, user, **data):
        self.client.force_authenticate(user)
        return self.client.post(f"/api/v1/admin/orders/{order.pk}/refund/", data, format="json")

    def test_only_admin_or_manager_can_refund(self):
        order = self.paid_order()
        for role in (StaffProfile.Role.SUPPORT, StaffProfile.Role.SALES, StaffProfile.Role.CATALOG):
            self.assertEqual(self.refund(order, self.staff(role)).status_code, 403)
        self.assertEqual(self.refund(order, self.customer).status_code, 403)
        self.assertEqual(self.fake.refunds, {})
        self.assertEqual(self.refund(order, self.staff(StaffProfile.Role.MANAGER), amount="10").status_code, 200)

    def test_full_refund_restores_stock_and_marks_order_refunded(self):
        order = self.paid_order()
        response = self.refund(order, self.staff(StaffProfile.Role.ADMIN), reason="Client absent")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["status"], "REFUNDED")
        sent = self.fake.calls[-1][2]
        self.assertEqual((sent["payment_intent_id"], sent["amount"], sent["reason"]), ("int_1", 106.9, "Client absent"))
        self.assertEqual(self.stock(), 10)
        payment = order.payments.get()
        self.assertEqual((payment.status, payment.refunded_amount), (Payment.Status.REFUNDED, Decimal("106.90")))

    def test_partial_refunds_cannot_exceed_the_payment(self):
        order = self.paid_order()
        admin = self.staff(StaffProfile.Role.ADMIN)
        self.assertEqual(self.refund(order, admin, amount="6.90").status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PAID)
        self.assertEqual(order.payments.get().status, Payment.Status.PARTIALLY_REFUNDED)
        for amount in ("100.01", "0", "-5", "abc"):
            self.assertEqual(self.refund(order, admin, amount=amount).status_code, 400)
        self.assertEqual(self.refund(order, admin, amount="100").status_code, 200)
        self.assertEqual(self.refund(order, admin).status_code, 400)
        self.assertEqual(self.stock(), 10)

    def test_refused_refund_is_not_counted(self):
        order = self.paid_order()
        self.fake.fail = 400
        self.assertEqual(self.refund(order, self.staff(StaffProfile.Role.ADMIN)).status_code, 502)
        payment = order.payments.get()
        self.assertEqual((payment.status, payment.refunded_amount), (Payment.Status.SUCCEEDED, Decimal("0.00")))
        self.assertEqual(Refund.objects.get().status, Refund.Status.FAILED)
        self.assertEqual(self.stock(), 8)

    def test_refund_failure_reported_later_by_webhook(self):
        order = self.paid_order()
        self.refund(order, self.staff(StaffProfile.Role.ADMIN), amount="20")
        self.webhook("evt_rf", "refund.failed", {"id": "rfd_1", "status": "FAILED", "payment_intent_id": "int_1"})
        payment = order.payments.get()
        self.assertEqual((payment.status, payment.refunded_amount), (Payment.Status.SUCCEEDED, Decimal("0.00")))

    # --- Back-office ---

    def test_staff_cannot_rewrite_amounts(self):
        order, token = self.checkout()
        self.client.force_authenticate(self.staff(StaffProfile.Role.SUPPORT))
        response = self.client.patch(f"/api/v1/admin/orders/{order.pk}/", {
            "total_amount": "1.00", "subtotal": "1.00", "payment_method": "cod", "shipping_cost": "0.00",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.client.patch(f"/api/v1/admin/orders/{order.pk}/", {"total_amount": "1.00", "payment_method": "cod"}, format="json")
        order.refresh_from_db()
        self.assertEqual((order.total_amount, order.payment_method), (Decimal("106.90"), "airwallex"))

    def test_cod_shipping_change_updates_the_total(self):
        order, _ = self.checkout(payment_method="cod")
        self.client.force_authenticate(self.staff(StaffProfile.Role.ADMIN))
        response = self.client.patch(f"/api/v1/admin/orders/{order.pk}/", {"shipping_cost": "15.00"}, format="json")
        self.assertEqual(response.data["total_amount"], "115.00")

    def test_order_with_payment_cannot_be_deleted(self):
        order = self.paid_order()
        self.client.force_authenticate(self.staff(StaffProfile.Role.ADMIN))
        self.assertEqual(self.client.delete(f"/api/v1/admin/orders/{order.pk}/").status_code, 400)
        self.assertTrue(Order.objects.filter(pk=order.pk).exists())

    # --- E-mails ---

    def test_cash_on_delivery_order_gets_an_email_in_the_customer_language(self):
        with self.captureOnCommitCallbacks(execute=True):
            order, _ = self.checkout(payment_method="cod", HTTP_ACCEPT_LANGUAGE="zh")
        self.assertEqual(order.language, "zh-hans")
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, f"您的订单 {order.reference}")
        self.assertIn("您将在收货或取货时支付 106.90 €", mail.outbox[0].body)
        self.assertIn("Couronne × 2", mail.outbox[0].body)

    def test_email_failure_never_breaks_the_order(self):
        with mock.patch("payments.emails.send_mail", side_effect=OSError("SMTP en panne")):
            with self.captureOnCommitCallbacks(execute=True):
                order, _ = self.checkout(payment_method="cod")
        self.assertEqual(order.status, Order.Status.PENDING)
