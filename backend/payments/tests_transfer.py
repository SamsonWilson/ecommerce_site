from datetime import timedelta
from decimal import Decimal

from django.core import mail
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import CustomerProfile, StaffProfile, User
from catalog.models import Product, ProductVariant
from orders.models import Order

from .models import Payment

BANK = dict(
    BANK_TRANSFER_HOLDER="Maison Lian Ltd", BANK_TRANSFER_BANK="Banque d'essai",
    BANK_TRANSFER_ACCOUNT="FR76 0000 0000 0000 0000 0000 000", BANK_TRANSFER_BIC="TESTFRPPXXX",
    BANK_TRANSFER_BANK_ADDRESS="", BANK_TRANSFER_DAYS=7,
)


@override_settings(**BANK)
class BankTransferTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        product = Product.objects.create(name="Couronne", slug="couronne")
        self.variant = ProductVariant.objects.create(
            product=product, sku="COU-1", retail_price=Decimal("100.00"),
            wholesale_price=Decimal("60.00"), moq=12, stock=50,
        )
        self.pro = User.objects.create_user(email="pro@example.com", password="Password123!")
        self.pro.profile.account_type = CustomerProfile.AccountType.WHOLESALE
        self.pro.profile.status = CustomerProfile.Status.APPROVED
        self.pro.profile.save()
        self.retail = User.objects.create_user(email="client@example.com", password="Password123!")

    def checkout(self, user, payment_method="transfer", quantity=12):
        self.client.force_authenticate(user)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post("/api/v1/checkout/", {
                "email": user.email, "items": [{"slug": "couronne", "quantity": quantity}],
                "shipping_address": {"country": "FR", "city": "Paris"},
                "shipping_method": "standard", "payment_method": payment_method,
            }, format="json")
        self.client.force_authenticate(None)
        return response

    def order(self):
        response = self.checkout(self.pro)
        self.assertEqual(response.status_code, 201, response.content)
        return Order.objects.get(reference=response.data["order"]["reference"])

    def staff(self, role):
        existing = User.objects.filter(email=f"{role.lower()}@example.com").first()
        if existing:
            return existing
        user = User.objects.create_user(email=f"{role.lower()}@example.com", password="Password123!", is_staff=True)
        StaffProfile.objects.create(user=user, role=role)
        return user

    def record(self, order, user=None, **data):
        self.client.force_authenticate(user or self.staff(StaffProfile.Role.ADMIN))
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(f"/api/v1/admin/orders/{order.pk}/record-transfer/", data, format="json")

    def stock(self):
        self.variant.refresh_from_db()
        return self.variant.stock

    # --- Disponibilité ---

    def test_transfer_offered_to_approved_wholesalers_only(self):
        self.client.force_authenticate(self.pro)
        self.assertIn("transfer", self.client.get("/api/v1/payments/config/").data["methods"])
        self.client.force_authenticate(self.retail)
        self.assertNotIn("transfer", self.client.get("/api/v1/payments/config/").data["methods"])
        self.assertEqual(self.checkout(self.retail, quantity=1).status_code, 400)
        with override_settings(BANK_TRANSFER_ACCOUNT=""):
            self.assertEqual(self.checkout(self.pro).status_code, 400)

    def test_transfer_order_reserves_stock_and_gives_bank_details(self):
        response = self.checkout(self.pro)
        self.assertEqual(response.status_code, 201, response.content)
        data = response.data["order"]
        self.assertEqual(data["status"], "PENDING")
        self.assertEqual(data["total_amount"], "720.00")  # 12 × 60 €, port offert dès 150 €
        transfer = data["bank_transfer"]
        self.assertEqual((transfer["account"], transfer["bic"], transfer["amount_due"]), (BANK["BANK_TRANSFER_ACCOUNT"], "TESTFRPPXXX", "720.00"))
        self.assertEqual(transfer["reference"], data["reference"])
        deadline = Order.objects.get(reference=data["reference"]).payment_deadline
        self.assertAlmostEqual(deadline, timezone.now() + timedelta(days=7), delta=timedelta(minutes=1))
        self.assertEqual(self.stock(), 38)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(BANK["BANK_TRANSFER_ACCOUNT"], mail.outbox[0].body)
        self.assertIn(data["reference"], mail.outbox[0].body)

    # --- Réception ---

    def test_full_transfer_marks_order_paid_without_taking_stock_twice(self):
        order = self.order()
        mail.outbox.clear()
        response = self.record(order, amount="720.00", bank_reference="TT-0001")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["status"], "PAID")
        self.assertIsNone(response.data["bank_transfer"])
        self.assertEqual(response.data["payments"][0]["refundable_amount"], "0")
        self.assertEqual(self.stock(), 38)
        self.assertIn("Votre paiement a bien été reçu.", mail.outbox[0].body)

    def test_partial_transfers_add_up(self):
        order = self.order()
        response = self.record(order, amount="700.00", bank_reference="TT-1")
        self.assertEqual((response.data["status"], response.data["bank_transfer"]["amount_due"]), ("PENDING", "20.00"))
        self.assertEqual(self.record(order, amount="20.00", bank_reference="TT-2").data["status"], "PAID")

    def test_shortfall_can_be_accepted(self):
        order = self.order()
        response = self.record(order, amount="695.00", bank_reference="TT-1", settle=True)
        self.assertEqual(response.data["status"], "PAID")
        self.assertEqual(Payment.objects.get().details["shortfall"], "25.00")

    def test_refusals(self):
        order = self.order()
        self.assertEqual(self.record(order, self.staff(StaffProfile.Role.SUPPORT), amount="720").status_code, 403)
        for amount in ("0", "-5", "abc", None):
            self.assertEqual(self.record(order, amount=amount).status_code, 400)
        self.record(order, amount="100", bank_reference="TT-1")
        self.assertEqual(self.record(order, amount="100", bank_reference="TT-1").status_code, 400)
        cod = Order.objects.get(reference=self.checkout(self.retail, "cod", 1).data["order"]["reference"])
        self.assertEqual(self.record(cod, amount="10").status_code, 400)
        # Un virement se rembourse à la banque, pas par l'API d'un prestataire.
        self.assertEqual(self.client.post(f"/api/v1/admin/orders/{order.pk}/refund/", {}, format="json").status_code, 400)

    # --- Annulation et échéance ---

    def test_cancelling_a_transfer_order_gives_the_stock_back(self):
        order = self.order()
        self.client.force_authenticate(self.staff(StaffProfile.Role.ADMIN))
        self.client.patch(f"/api/v1/admin/orders/{order.pk}/", {"status": "CANCELLED"}, format="json")
        self.assertEqual(self.stock(), 50)

    def test_expired_reservations_are_cancelled(self):
        overdue, partial, recent = self.order(), self.order(), self.order()
        Order.objects.filter(pk__in=[overdue.pk, partial.pk]).update(payment_deadline=timezone.now() - timedelta(hours=1))
        self.record(partial, amount="100", bank_reference="TT-P")
        self.assertEqual(self.stock(), 14)
        call_command("expire_transfers", "--dry-run", stdout=open("/dev/null", "w"))
        self.assertEqual(self.stock(), 14)
        call_command("expire_transfers", stdout=open("/dev/null", "w"))
        statuses = dict(Order.objects.values_list("pk", "status"))
        self.assertEqual(
            (statuses[overdue.pk], statuses[partial.pk], statuses[recent.pk]),
            ("CANCELLED", "PENDING", "PENDING"),
        )
        self.assertEqual(self.stock(), 26)
