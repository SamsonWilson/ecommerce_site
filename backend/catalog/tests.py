from django.test import TestCase

from .admin_serializers import AdminProductSerializer
from .models import Category, Product, ProductVariant


class AdminProductSerializerDuplicateTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Bijoux", slug="bijoux")

    def test_create_rejects_duplicate_product_name_in_same_category(self):
        Product.objects.create(name="Diadème Royal", slug="diademe-royal", category=self.category)

        payload = {
            "name": "Diadème Royal",
            "category": self.category.id,
            "colors": [],
            "wedding_moments": [],
            "sales_channel": "BOTH",
            "description": "",
            "is_active": True,
            "variants": [{
                "sku": "ML-DUP-001",
                "retail_price": "120.00",
                "wholesale_price": "90.00",
                "moq": 1,
                "max_order_qty": 20,
                "stock": 10,
            }],
        }

        serializer = AdminProductSerializer(data=payload)

        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)

    def test_create_rejects_duplicate_variant_sku(self):
        ProductVariant.objects.create(
            product=Product.objects.create(name="Diadème Luxe", slug="diademe-luxe", category=self.category),
            sku="ML-SKU-001",
            retail_price="150.00",
            wholesale_price="120.00",
        )

        payload = {
            "name": "Boucles d'oreilles Étoile",
            "category": self.category.id,
            "colors": [],
            "wedding_moments": [],
            "sales_channel": "BOTH",
            "description": "",
            "is_active": True,
            "variants": [{
                "sku": "ML-SKU-001",
                "retail_price": "200.00",
                "wholesale_price": "160.00",
                "moq": 1,
                "max_order_qty": 10,
                "stock": 3,
            }],
        }

        serializer = AdminProductSerializer(data=payload)

        self.assertFalse(serializer.is_valid())
        self.assertIn("variants", serializer.errors)
