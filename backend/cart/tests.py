from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from catalog.models import Product, ProductVariant
from cart.models import Cart, CartItem


class CartTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="cartuser@example.com", password="Password123!")
        self.product = Product.objects.create(name="Voile de Mariée", slug="voile-mariee")
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="VM-LONG",
            retail_price=Decimal("120.00"),
            wholesale_price=Decimal("60.00"),
            moq=1,
        )

    def test_authenticated_user_can_add_to_cart(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/v1/cart/items/", {"variant_id": self.variant.id, "quantity": 2}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CartItem.objects.filter(variant=self.variant).count(), 1)
        self.assertEqual(CartItem.objects.get(variant=self.variant).quantity, 2)

    def test_sync_guest_cart(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "items": [
                {"variant_id": self.variant.id, "quantity": 3}
            ]
        }
        response = self.client.post("/api/v1/cart/sync/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(CartItem.objects.get(variant=self.variant).quantity, 3)
