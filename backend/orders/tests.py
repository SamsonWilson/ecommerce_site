from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
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

