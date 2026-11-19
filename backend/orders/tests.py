from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import CustomerProfile, User, StaffProfile
from catalog.models import Product, ProductVariant
from orders.models import Order, OrderItem


class OrderTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="buyer@example.com", password="Password123!")
        self.product = Product.objects.create(name="Diadème Étoilé", slug="diademe-etoile")
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="DE-SILVER",
            retail_price=Decimal("95.00"),
            wholesale_price=Decimal("40.00"),
            moq=1,
            stock=100,
        )

    def test_checkout_creates_order_with_frozen_prices(self):
        payload = {
            "email": "buyer@example.com",
            "shipping_address": {
                "address": "10 Rue de la Paix",
                "city": "Paris",
                "zip": "75002",
                "country": "FR",
                "method": "standard",
            },
            "items": [
                {"variant_id": self.variant.id, "quantity": 2}
            ],
        }
        response = self.client.post("/api/v1/checkout/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("order", response.data)
        self.assertIn("payment_token", response.data)
        self.assertNotIn("client_secret", response.data)

        order_ref = response.data["order"]["reference"]
        order = Order.objects.get(reference=order_ref)
        # 190 € de panier : la livraison standard est offerte dès 150 €.
        self.assertEqual(order.shipping_cost, Decimal("0.00"))
        self.assertEqual(order.total_amount, Decimal("190.00"))
        self.assertEqual(order.items.count(), 1)

        item = order.items.first()
        self.assertEqual(item.unit_price, Decimal("95.00"))
        self.assertEqual(item.sku, "DE-SILVER")

    def test_checkout_reduces_stock_on_valid_sale(self):
        self.variant.stock = 10
        self.variant.save(update_fields=["stock"])

        cashier = User.objects.create_user(email="caisse@example.com", password="Password123!", is_staff=True)
        StaffProfile.objects.create(user=cashier, role=StaffProfile.Role.SALES)
        self.client.force_authenticate(user=cashier)

        payload = {
            "email": "buyer@example.com",
            "mark_paid": True,
            "items": [
                {"variant_id": self.variant.id, "quantity": 3}
            ],
        }

        response = self.client.post("/api/v1/checkout/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 7)

    def test_cancelling_an_unpaid_order_does_not_add_stock(self):
        """Le stock n'est retiré qu'au paiement : l'annulation d'une commande en attente n'a rien à rendre."""
        order = Order.objects.create(
            reference="CMD-ATTENTE", email="buyer@example.com", subtotal=Decimal("95.00"),
            total_amount=Decimal("95.00"), shipping_address={"country": "FR"},
        )
        OrderItem.objects.create(order=order, variant=self.variant, product_name="D", sku="DE-SILVER",
                                 unit_price=Decimal("95.00"), quantity=3)
        admin = User.objects.create_user(email="admin@example.com", password="Password123!", is_staff=True)
        StaffProfile.objects.create(user=admin, role=StaffProfile.Role.ADMIN)
        self.client.force_authenticate(user=admin)
        response = self.client.patch(f"/api/v1/admin/orders/{order.pk}/", {"status": "CANCELLED"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 100)

    def test_checkout_fails_if_insufficient_stock(self):
        payload = {
            "email": "buyer@example.com",
            "items": [
                {"variant_id": self.variant.id, "quantity": 150}
            ],
        }
        response = self.client.post("/api/v1/checkout/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Stock insuffisant", response.data["detail"])

    def test_admin_cannot_skip_order_status_steps(self):
        admin = User.objects.create_user(email="admin@example.com", password="Password123!", is_staff=True)
        StaffProfile.objects.create(user=admin, role=StaffProfile.Role.ADMIN)

        order = Order.objects.create(
            reference="CMD-SEC-001",
            email="buyer@example.com",
            status=Order.Status.PENDING,
            subtotal=Decimal("95.00"),
            shipping_cost=Decimal("0.00"),
            total_amount=Decimal("95.00"),
            shipping_address={"full_name": "Client Test", "address": "1 rue de Paris", "city": "Paris", "country": "FR"},
        )

        self.client.force_authenticate(user=admin)
        response = self.client.patch(f"/api/v1/admin/orders/{order.id}/", {"status": Order.Status.DELIVERED}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("étape", response.data["detail"].lower())
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PENDING)



class CheckoutSecurityTests(TestCase):
    """Le checkout est public : rien de ce qu'envoie le navigateur n'est cru sur parole."""

    URL = "/api/v1/checkout/"

    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.create(name="Couronne", slug="couronne")
        # moq=12 comme dans le vrai catalogue : c'est un minimum de gros.
        self.variant = ProductVariant.objects.create(
            product=self.product, sku="COU-1", retail_price=Decimal("100.00"),
            wholesale_price=Decimal("60.00"), moq=12, stock=10,
        )
        self.cashier = User.objects.create_user(email="caisse@example.com", password="Password123!", is_staff=True)
        StaffProfile.objects.create(user=self.cashier, role=StaffProfile.Role.SALES)

    def _item(self, **extra):
        return {"variant_id": self.variant.id, "quantity": 1, **extra}

    def _post(self, items=None, **extra):
        address = extra.pop("shipping_address", {})
        if isinstance(address, dict):
            address = {"country": "FR", "method": "standard", **address}
        payload = {"email": "client@example.com", "items": items or [self._item()], "shipping_address": address, **extra}
        return self.client.post(self.URL, payload, format="json")

    def _wholesaler(self):
        user = User.objects.create_user(email="pro@example.com", password="Password123!")
        user.profile.account_type = CustomerProfile.AccountType.WHOLESALE
        user.profile.status = CustomerProfile.Status.APPROVED
        user.profile.save()
        return user

    def assertRefused(self, response, code=status.HTTP_400_BAD_REQUEST):
        self.assertEqual(response.status_code, code, response.content)
        self.assertEqual(Order.objects.count(), 0)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 10)

    # --- Encaissement réservé à la caisse ---

    def test_visitor_cannot_mark_order_paid(self):
        self.assertRefused(self._post(mark_paid=True), status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_mark_order_paid(self):
        self.client.force_authenticate(user=User.objects.create_user(email="c@example.com", password="Password123!"))
        self.assertRefused(self._post(mark_paid="true"), status.HTTP_403_FORBIDDEN)

    def test_employee_without_orders_section_cannot_mark_order_paid(self):
        employee = User.objects.create_user(email="cat@example.com", password="Password123!", is_staff=True)
        StaffProfile.objects.create(user=employee, role=StaffProfile.Role.CATALOG)
        self.client.force_authenticate(user=employee)
        self.assertRefused(self._post(mark_paid=True), status.HTTP_403_FORBIDDEN)

    def test_cashier_records_paid_sale(self):
        self.client.force_authenticate(user=self.cashier)
        response = self._post(
            [self._item(quantity=3)], mark_paid=True, cashier_name="Awa", payment_method="cash",
            shipping_address={"method": "pickup", "name": "Client comptoir"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(response.data["order"]["status"], Order.Status.PAID)
        self.assertEqual(response.data["order"]["cashier_name"], "Awa")
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 7)

    # --- Prix et identité fixés par le serveur ---

    def test_browser_price_is_ignored_for_everyone(self):
        response = self._post([self._item(unit_price="0.01", unit="0.01")], shipping_cost="0.00")
        # 100 € + 6,90 € de port standard : ni le prix ni le port ne viennent du navigateur.
        self.assertEqual(response.data["order"]["total_amount"], "106.90")

        self.client.force_authenticate(user=self.cashier)
        response = self._post([self._item(unit_price="0.01")], mark_paid=True)
        self.assertEqual(response.data["order"]["total_amount"], "100.00")

    def test_visitor_cannot_pose_as_cashier(self):
        response = self._post(cashier_name="Faux", shipping_address={"cashier_name": "Faux", "cashier": "Faux"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertIsNone(response.data["order"]["cashier_name"])

    def test_online_order_cannot_use_counter_payment(self):
        self.assertRefused(self._post(payment_method="cash"))

    # --- Articles commandables ---

    def test_unknown_article_is_refused_not_replaced(self):
        for item in ({"variant_id": 999999}, {"sku": "INCONNU"}, {"slug": "inconnu"}, {"quantity": 1}):
            self.assertRefused(self._post([item]))

    def test_inactive_product_is_refused(self):
        self.product.is_active = False
        self.product.save()
        self.assertRefused(self._post())

    def test_wholesale_only_product_is_refused_to_retail_customers(self):
        self.product.sales_channel = Product.SalesChannel.WHOLESALE
        self.product.save()
        self.assertRefused(self._post())

    def test_retail_customer_is_not_subject_to_wholesale_moq(self):
        response = self._post()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

    def test_wholesaler_gets_wholesale_price_and_respects_moq(self):
        self.variant.stock = 50
        self.variant.save()
        self.client.force_authenticate(user=self._wholesaler())

        self.assertEqual(self._post([self._item(quantity=11)]).status_code, status.HTTP_400_BAD_REQUEST)

        response = self._post([self._item(quantity=12)])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(response.data["order"]["total_amount"], "720.00")

    def test_max_order_quantity_is_enforced(self):
        self.variant.max_order_qty = 2
        self.variant.save()
        self.assertRefused(self._post([self._item(quantity=3)]))

    def test_duplicate_lines_share_the_stock_check(self):
        self.assertRefused(self._post([self._item(quantity=6), self._item(quantity=6)]))

    def test_slug_targets_the_variant_shown_in_the_shop(self):
        self.variant.stock = 0
        self.variant.save()
        shown = ProductVariant.objects.create(
            product=self.product, sku="COU-2", retail_price=Decimal("80.00"),
            wholesale_price=Decimal("50.00"), stock=5,
        )
        response = self._post([{"slug": "couronne", "quantity": 1}])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(response.data["order"]["items"][0]["variant"], shown.id)

    def test_storefront_payload_is_accepted(self):
        """Exactement ce qu'envoie frontend/src/pages/Checkout.jsx."""
        response = self.client.post(self.URL, {
            "email": "client@example.com",
            "shipping_address": {
                "full_name": "Awa Diallo", "address": "1 rue de Paris", "postal_code": "75001",
                "city": "Paris", "country": "FR", "phone": "0102030405",
            },
            "shipping_method": "standard",
            "payment_method": "cod",
            "items": [{"slug": "couronne", "quantity": 2}],
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(response.data["order"]["status"], Order.Status.PENDING)
        self.assertEqual(response.data["order"]["total_amount"], "200.00")

    # --- Entrées mal formées : 400, jamais 500 ---

    def test_invalid_quantities_are_refused(self):
        for quantity in (0, -5, "abc", 1.5, True, None, [1]):
            self.assertRefused(self._post([self._item(quantity=quantity)]))

    def test_malformed_requests_are_refused(self):
        self.assertRefused(self._post(shipping_address=["poison"]))
        self.assertRefused(self._post(shipping_address="poison"))
        self.assertRefused(self._post(items={"a": 1}))
        self.assertRefused(self._post(items=["a"]))
        self.assertRefused(self._post([{"variant_id": "abc", "quantity": 1}]))
        self.assertRefused(self._post([{"variant_id": {"a": 1}, "quantity": 1}]))
        self.assertRefused(self._post(payment_method=["card"]))
        self.assertRefused(self._post(email="pas-un-email"))
        self.assertRefused(self.client.post(self.URL, [1, 2], format="json"))

    def test_too_many_lines_are_refused(self):
        self.assertRefused(self._post([self._item()] * 101))

    def test_old_malformed_order_does_not_break_admin_list(self):
        Order.objects.create(
            reference="CMD-ANCIENNE", email="x@example.com", subtotal=Decimal("1"),
            total_amount=Decimal("1"), shipping_address=["poison"],
        )
        self.client.force_authenticate(user=self.cashier)
        self.assertEqual(self.client.get("/api/v1/admin/orders/").status_code, status.HTTP_200_OK)


class CheckoutLanguageTests(TestCase):
    """Les refus s'affichent dans la langue du client, avec le nom traduit du produit."""

    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.create(name="Couronne", slug="couronne")
        self.product.set_translation("zh", {"name": "凤冠"})
        self.product.save()
        self.variant = ProductVariant.objects.create(
            product=self.product, sku="COU-1", retail_price=Decimal("100.00"),
            wholesale_price=Decimal("60.00"), stock=1,
        )

    def _order_too_much(self, language):
        return self.client.post("/api/v1/checkout/", {
            "email": "client@example.com", "items": [{"slug": "couronne", "quantity": 5}],
        }, format="json", HTTP_ACCEPT_LANGUAGE=language)

    def test_refusal_is_translated(self):
        self.assertEqual(self._order_too_much("zh").data["detail"], "凤冠 库存不足（现有 1 件）。")
        self.assertEqual(self._order_too_much("en").data["detail"], "Not enough stock for Couronne (available: 1).")
        self.assertEqual(self._order_too_much("fr").data["detail"], "Stock insuffisant pour Couronne (Disponible : 1).")


import threading
import time
import unittest
from unittest import mock

from django.db import connection
from django.test import TransactionTestCase

from catalog.models import StockMovement
from orders.views import deduct_order_stock


@unittest.skipUnless(connection.vendor == "postgresql", "SQLite verrouille toute la base : rien à prouver")
class ConcurrentStockDeductionTests(TransactionTestCase):
    """M5 : deux paiements confirmés en même temps ne doivent pas écraser le retrait de l'autre."""

    def test_two_payments_at_once_both_deduct(self):
        product = Product.objects.create(name="Diadème", slug="diademe")
        variant = ProductVariant.objects.create(product=product, sku="D-1", retail_price=Decimal("10"),
                                                wholesale_price=Decimal("5"), stock=10)
        orders = []
        for n in range(2):
            order = Order.objects.create(reference=f"CMD-CONC-{n}", email="c@example.com",
                                         subtotal=Decimal("30"), total_amount=Decimal("30"))
            OrderItem.objects.create(order=order, variant=variant, product_name="D", sku="D-1",
                                     unit_price=Decimal("10"), quantity=3)
            orders.append(order)

        real_create = StockMovement.objects.create

        def slow_create(**kwargs):
            # Transaction gardée ouverte : sans verrou, l'autre lirait l'ancien stock.
            time.sleep(0.5)
            return real_create(**kwargs)

        def pay(order):
            try:
                deduct_order_stock(order)
            finally:
                connection.close()

        with mock.patch.object(StockMovement.objects, "create", side_effect=slow_create):
            threads = [threading.Thread(target=pay, args=(o,)) for o in orders]
            for thread in threads:
                thread.start()
                time.sleep(0.1)
            for thread in threads:
                thread.join()

        variant.refresh_from_db()
        self.assertEqual(variant.stock, 4)
