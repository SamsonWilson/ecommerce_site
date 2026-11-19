from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, StaffProfile
from catalog.models import Product, ProductVariant
from quotes.models import QuoteRequest


class QuoteTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.create(name="Peigne de Mariée", slug="peigne-mariee")
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="PM-SILVER",
            retail_price=Decimal("45.00"),
            wholesale_price=Decimal("20.00"),
            moq=10,
        )

        self.user = User.objects.create_user(email="pro@boutique.com", password="Password123!")

        self.admin_user = User.objects.create_superuser(
            email="b2badmin@maisonlian.com", password="AdminPassword123!", is_staff=True, is_superuser=True
        )
        StaffProfile.objects.create(user=self.admin_user, role=StaffProfile.Role.ADMIN)

    def test_create_quote_request_guest(self):
        payload = {
            "company": "Boutique Elegant",
            "contact_name": "Claire Dupont",
            "contact_email": "claire@boutique.com",
            "phone": "+33612345678",
            "message": "Besoin de 50 pièces pour la saison été.",
            "items": [
                {
                    "variant": self.variant.id,
                    "quantity": 50,
                }
            ],
        }
        response = self.client.post("/api/v1/quotes/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(QuoteRequest.objects.filter(contact_email="claire@boutique.com").exists())

    def test_authenticated_user_quotes_retrieval(self):
        quote = QuoteRequest.objects.create(
            customer=self.user,
            company="Pro Store",
            contact_name="Pro",
            contact_email="pro@boutique.com",
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/v1/quotes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results", response.data)), 1)


from datetime import timedelta as _timedelta
from unittest import mock as _mock

from django.core import mail as _mail
from django.test import override_settings as _override_settings
from django.utils import timezone as _timezone

from accounts.models import CustomerProfile, StaffProfile
from orders.models import Order
from payments.tests import KEYS, FakeAirwallex
from payments.tests_transfer import BANK

from .models import QuoteRequest


@_override_settings(**BANK, **KEYS)
class QuoteToPaymentTests(TestCase):
    """De la demande au paiement : l'équipe chiffre, le client accepte et règle."""

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.fake = FakeAirwallex()
        for name in ("post", "request"):
            patcher = _mock.patch(f"payments.providers.airwallex.requests.{name}", getattr(self.fake, name))
            patcher.start()
            self.addCleanup(patcher.stop)
        self.client = APIClient()
        product = Product.objects.create(name="Couronne", slug="couronne")
        self.variant = ProductVariant.objects.create(
            product=product, sku="COU-1", retail_price=Decimal("100.00"),
            wholesale_price=Decimal("60.00"), moq=12, stock=100,
        )
        self.sales = User.objects.create_user(email="ventes@example.com", password="Password123!", is_staff=True)
        StaffProfile.objects.create(user=self.sales, role=StaffProfile.Role.SALES)

    def request_quote(self, quantity=50, user=None):
        self.client.force_authenticate(user)
        response = self.client.post("/api/v1/quotes/", {
            "contact_email": "acheteur@boutique.fr", "company": "Boutique Lys", "country": "FR",
            "message": "Pour notre saison des mariages", "items": [{"slug": "couronne", "quantity": quantity}],
        }, format="json")
        self.client.force_authenticate(None)
        self.assertEqual(response.status_code, 201, response.content)
        return QuoteRequest.objects.get(reference=response.data["reference"])

    def send(self, quote, price="55.00", shipping="40.00", user=None, **extra):
        self.client.force_authenticate(user or self.sales)
        items = [{"id": item.pk, "unit_price": price} for item in quote.items.all()]
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(f"/api/v1/admin/quotes/{quote.pk}/send/",
                                        {"items": items, "shipping_cost": shipping, **extra}, format="json")
        self.client.force_authenticate(None)
        quote.refresh_from_db()
        return response

    def accept(self, quote, payment_method="transfer", token=None, **address):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post("/api/v1/quotes/accept/", {
                "reference": quote.reference, "token": token or quote.public_token,
                "payment_method": payment_method,
                "shipping_address": {"full_name": "Awa Diallo", "address": "1 rue de Lyon",
                                     "city": "Lyon", "country": "fr", **address},
            }, format="json")

    def stock(self):
        self.variant.refresh_from_db()
        return self.variant.stock

    # --- Demande ---

    def test_quote_from_cart_slugs_without_moq_for_non_wholesalers(self):
        quote = self.request_quote(quantity=3)
        self.assertEqual(quote.items.get().variant, self.variant)

    def test_moq_applies_to_approved_wholesalers(self):
        pro = User.objects.create_user(email="pro@example.com", password="Password123!")
        pro.profile.account_type = CustomerProfile.AccountType.WHOLESALE
        pro.profile.status = CustomerProfile.Status.APPROVED
        pro.profile.save()
        self.client.force_authenticate(pro)
        response = self.client.post("/api/v1/quotes/", {
            "contact_email": "pro@example.com", "items": [{"slug": "couronne", "quantity": 3}],
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_wholesale_account_request_is_saved(self):
        """Ce qu'envoie le formulaire « Espace pro » : une demande sans article."""
        response = self.client.post("/api/v1/quotes/", {
            "contact_email": "pro@example.com", "company": "Boutique Lys",
            "message": "Ouverture de compte grossiste. SIRET : 123", "items": [],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.content)

    # --- Chiffrage ---

    def test_sales_team_prices_and_sends(self):
        quote = self.request_quote()
        response = self.send(quote)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual((quote.status, quote.quoted_total), ("QUOTED", Decimal("2790.00")))  # 50 × 55 + 40
        self.assertEqual(quote.valid_until, _timezone.localdate() + _timedelta(days=30))
        self.assertEqual(len(_mail.outbox), 1)
        self.assertIn(f"/devis/{quote.reference}?token={quote.public_token}", _mail.outbox[0].body)
        self.assertEqual(_mail.outbox[0].to, ["acheteur@boutique.fr"])

    def test_pricing_refusals(self):
        quote = self.request_quote()
        catalog = User.objects.create_user(email="cat@example.com", password="Password123!", is_staff=True)
        StaffProfile.objects.create(user=catalog, role=StaffProfile.Role.CATALOG)
        self.assertEqual(self.send(quote, user=catalog).status_code, 403)
        self.assertEqual(self.send(quote, price="-1").status_code, 400)
        self.assertEqual(self.send(quote, price="abc").status_code, 400)
        self.assertEqual(self.send(quote, shipping="-5").status_code, 400)
        self.assertEqual(self.send(quote, valid_until="2001-01-01").status_code, 400)
        self.client.force_authenticate(self.sales)
        self.assertEqual(self.client.post(f"/api/v1/admin/quotes/{quote.pk}/send/", {"items": []}, format="json").status_code, 400)
        self.assertEqual(quote.status, "NEW")

    def test_total_and_status_cannot_be_forced(self):
        quote = self.request_quote()
        self.send(quote)
        self.client.force_authenticate(self.sales)
        response = self.client.patch(f"/api/v1/admin/quotes/{quote.pk}/", {"quoted_total": "1.00"}, format="json")
        quote.refresh_from_db()
        self.assertEqual(quote.quoted_total, Decimal("2790.00"))
        response = self.client.patch(f"/api/v1/admin/quotes/{quote.pk}/", {"status": "ACCEPTED"}, format="json")
        self.assertEqual(response.status_code, 400)

    # --- Lien du client ---

    def test_link_needs_the_secret(self):
        quote = self.request_quote()
        self.send(quote)
        self.assertEqual(self.client.get(f"/api/v1/quotes/view/?ref={quote.reference}&token=faux").status_code, 404)
        response = self.client.get(f"/api/v1/quotes/view/?ref={quote.reference}&token={quote.public_token}")
        self.assertEqual(response.data["quoted_total"], "2790.00")
        self.assertEqual(response.data["payment_methods"], ["transfer", "airwallex"])
        self.assertEqual(response.data["items"][0]["line_total"], "2750.00")
        self.assertEqual(self.accept(quote, token="faux").status_code, 404)

    def test_accept_by_transfer_creates_reserved_wholesale_order(self):
        quote = self.request_quote()
        self.send(quote)
        _mail.outbox.clear()
        response = self.accept(quote)
        self.assertEqual(response.status_code, 201, response.content)
        order = Order.objects.get(reference=response.data["order"]["reference"])
        self.assertEqual((order.status, order.order_type, order.total_amount, order.shipping_cost),
                         ("PENDING", "WHOLESALE", Decimal("2790.00"), Decimal("40.00")))
        self.assertEqual(order.items.get().unit_price, Decimal("55.00"))
        self.assertEqual(order.shipping_address["country"], "FR")
        self.assertEqual(response.data["order"]["bank_transfer"]["amount_due"], "2790.00")
        self.assertEqual(self.stock(), 50)
        quote.refresh_from_db()
        self.assertEqual((quote.status, quote.order), ("ACCEPTED", order))
        self.assertIn(BANK["BANK_TRANSFER_ACCOUNT"], _mail.outbox[0].body)
        self.assertEqual(self.accept(quote).status_code, 400)
        view = self.client.get(f"/api/v1/quotes/view/?ref={quote.reference}&token={quote.public_token}").data
        self.assertEqual(view["order"]["reference"], order.reference)

    def test_accept_and_pay_online(self):
        quote = self.request_quote()
        self.send(quote)
        response = self.accept(quote, payment_method="airwallex")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(self.stock(), 100)  # retiré au paiement seulement
        start = self.client.post("/api/v1/payments/start/", {
            "reference": response.data["order"]["reference"], "token": response.data["payment_token"],
        }, format="json")
        self.assertEqual(start.status_code, 200, start.content)
        self.assertEqual(self.fake.calls[0][2]["amount"], 2790.0)

    def test_acceptance_refusals(self):
        quote = self.request_quote()
        self.assertEqual(self.accept(quote, token="x").status_code, 404)  # pas encore chiffré : aucun jeton
        self.send(quote)
        self.assertEqual(self.accept(quote, payment_method="cod").status_code, 400)
        self.assertEqual(self.accept(quote, city="").status_code, 400)
        self.assertEqual(self.accept(quote, country="France").status_code, 400)
        self.variant.stock = 10
        self.variant.save()
        self.assertEqual(self.accept(quote).status_code, 400)
        QuoteRequest.objects.filter(pk=quote.pk).update(valid_until=_timezone.localdate() - _timedelta(days=1))
        self.variant.stock = 100
        self.variant.save()
        self.assertEqual(self.accept(quote).status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_customer_sees_the_link_in_my_quotes(self):
        buyer = User.objects.create_user(email="acheteur@boutique.fr", password="Password123!")
        quote = self.request_quote(user=buyer)
        self.client.force_authenticate(buyer)
        self.assertIsNone(self.client.get("/api/v1/quotes/").data["results"][0]["link_token"])
        self.send(quote)
        self.client.force_authenticate(buyer)
        self.assertEqual(self.client.get("/api/v1/quotes/").data["results"][0]["link_token"], quote.public_token)
