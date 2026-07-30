from decimal import Decimal
from django.test import TestCase
from accounts.models import User, CustomerProfile
from catalog.models import Product, ProductVariant
from pricing.models import PriceTier
from pricing.services import resolve_price


class PriceResolverTestCase(TestCase):
    def setUp(self):
        self.product = Product.objects.create(name="Couronne Royale", slug="couronne-royale")
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="CR-GOLD",
            retail_price=Decimal("150.00"),
            wholesale_price=Decimal("80.00"),
            moq=5,
            max_order_qty=100,
        )

        self.tier = PriceTier.objects.create(name="Distributeur VIP", discount_percent=Decimal("10.00"), priority=1)

        # Users
        self.anonymous_user = None
        self.retail_user = User.objects.create_user(email="retail@example.com", password="Password123!")
        
        self.wholesale_pending = User.objects.create_user(email="pending@example.com", password="Password123!")
        self.wholesale_pending.profile.account_type = CustomerProfile.AccountType.WHOLESALE
        self.wholesale_pending.profile.status = CustomerProfile.Status.PENDING
        self.wholesale_pending.profile.save()

        self.wholesale_approved = User.objects.create_user(email="approved@example.com", password="Password123!")
        self.wholesale_approved.profile.account_type = CustomerProfile.AccountType.WHOLESALE
        self.wholesale_approved.profile.status = CustomerProfile.Status.APPROVED
        self.wholesale_approved.profile.price_tier = self.tier
        self.wholesale_approved.profile.save()

    def test_anonymous_user_gets_retail_price(self):
        resolved = resolve_price(self.variant, user=self.anonymous_user)
        self.assertEqual(resolved.unit_price, Decimal("150.00"))
        self.assertFalse(resolved.is_wholesale)
        self.assertIsNone(resolved.original_price)
        self.assertEqual(resolved.moq, 5)

    def test_retail_user_gets_retail_price(self):
        resolved = resolve_price(self.variant, user=self.retail_user)
        self.assertEqual(resolved.unit_price, Decimal("150.00"))
        self.assertFalse(resolved.is_wholesale)

    def test_pending_wholesale_user_gets_retail_price(self):
        resolved = resolve_price(self.variant, user=self.wholesale_pending)
        self.assertEqual(resolved.unit_price, Decimal("150.00"))
        self.assertFalse(resolved.is_wholesale)

    def test_approved_wholesale_user_gets_discounted_wholesale_price(self):
        # Base wholesale is 80.00. 10% discount = 72.00
        resolved = resolve_price(self.variant, user=self.wholesale_approved)
        self.assertEqual(resolved.unit_price, Decimal("72.00"))
        self.assertTrue(resolved.is_wholesale)
        self.assertEqual(resolved.original_price, Decimal("150.00"))
        self.assertEqual(resolved.moq, 5)
