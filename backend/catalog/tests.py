from django.test import TestCase

from .admin_serializers import AdminCategorySerializer, AdminProductSerializer
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


class AdminCategorySerializerDuplicateTests(TestCase):
    def setUp(self):
        self.cat = Category.objects.create(name="Colliers", slug="colliers")

    def test_create_rejects_duplicate_category_name(self):
        s = AdminCategorySerializer(data={"name": "Colliers"})
        self.assertFalse(s.is_valid())
        self.assertIn("name", s.errors)

    def test_create_rejects_case_insensitive_duplicate_category_name(self):
        s = AdminCategorySerializer(data={"name": "  colliers  "})
        self.assertFalse(s.is_valid())
        self.assertIn("name", s.errors)

    def test_create_rejects_duplicate_category_slug(self):
        s = AdminCategorySerializer(data={"name": "Nouveau Nom", "slug": "colliers"})
        self.assertFalse(s.is_valid())
        self.assertIn("slug", s.errors)

    def test_update_allows_same_name_on_same_instance(self):
        s = AdminCategorySerializer(instance=self.cat, data={"name": "Colliers", "slug": "colliers"})
        self.assertTrue(s.is_valid(), s.errors)

    def test_update_rejects_duplicate_name_of_another_category(self):
        cat2 = Category.objects.create(name="Bracelets", slug="bracelets")
        s = AdminCategorySerializer(instance=cat2, data={"name": "Colliers", "slug": "bracelets"})
        self.assertFalse(s.is_valid())
        self.assertIn("name", s.errors)
