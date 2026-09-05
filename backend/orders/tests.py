from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, StaffProfile
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
            },
            "items": [
                {"variant_id": self.variant.id, "quantity": 2}
            ],
        }
        response = self.client.post("/api/v1/checkout/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("order", response.data)
        self.assertIn("client_secret", response.data)

        order_ref = response.data["order"]["reference"]
        order = Order.objects.get(reference=order_ref)
        self.assertEqual(order.total_amount, Decimal("190.00"))
        self.assertEqual(order.items.count(), 1)

        item = order.items.first()
        self.assertEqual(item.unit_price, Decimal("95.00"))
        self.assertEqual(item.sku, "DE-SILVER")

    def test_checkout_reduces_stock_on_valid_sale(self):
        self.variant.stock = 10
        self.variant.save(update_fields=["stock"])

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

