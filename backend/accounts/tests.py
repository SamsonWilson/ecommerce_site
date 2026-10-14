from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, CustomerProfile, StaffProfile
from pricing.models import PriceTier


class AccountsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(
            email="admin@maisonlian.com",
            password="AdminPassword123!",
            is_staff=True,
            is_superuser=True,
        )
        StaffProfile.objects.create(
            user=self.admin_user,
            role=StaffProfile.Role.ADMIN,
        )

        self.customer_user = User.objects.create_user(
            email="client@example.com",
            password="ClientPassword123!",
        )
        self.tier = PriceTier.objects.create(name="VIP", discount_percent=15, priority=1)

    def test_customer_profile_created_automatically(self):
        self.assertIsNotNone(self.customer_user.profile)
        self.assertEqual(self.customer_user.profile.account_type, CustomerProfile.AccountType.RETAIL)
        self.assertEqual(self.customer_user.profile.status, CustomerProfile.Status.APPROVED)

    def test_admin_can_approve_b2b_customer(self):
        self.client.force_authenticate(user=self.admin_user)
        profile_id = self.customer_user.profile.id
        
        url = f"/api/v1/admin/customers/{profile_id}/to-wholesale/"
        response = self.client.post(url, {"price_tier": self.tier.id}, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.customer_user.profile.refresh_from_db()
        self.assertEqual(self.customer_user.profile.account_type, CustomerProfile.AccountType.WHOLESALE)
        self.assertEqual(self.customer_user.profile.status, CustomerProfile.Status.APPROVED)
        self.assertEqual(self.customer_user.profile.price_tier, self.tier)

    def test_unauthenticated_cannot_access_admin_customers(self):
        url = f"/api/v1/admin/customers/{self.customer_user.profile.id}/approve/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_staff_sections_catalog(self):
        self.client.force_authenticate(user=self.admin_user)
        url = "/api/v1/admin/staff/sections/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        keys = [item["key"] for item in response.data]
        self.assertIn("dashboard", keys)
        self.assertIn("orders", keys)
        self.assertIn("catalog", keys)
        self.assertIn("staff", keys)

    def test_staff_set_custom_sections_and_reset(self):
        self.client.force_authenticate(user=self.admin_user)
        # Create an employee with SUPPORT role (default sections: ['dashboard', 'orders', 'customers'])
        emp_user = User.objects.create_user(email="support@example.com", password="Password123!", is_staff=True)
        staff_prof = StaffProfile.objects.create(user=emp_user, role=StaffProfile.Role.SUPPORT)
        self.assertEqual(staff_prof.sections, ["dashboard", "orders", "customers"])

        # Admin assigns custom pages: dashboard, orders, catalog
        url = f"/api/v1/admin/staff/{staff_prof.id}/set-sections/"
        response = self.client.post(url, {"sections": ["dashboard", "orders", "catalog"]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sections"], ["dashboard", "orders", "catalog"])
        self.assertEqual(response.data["custom_sections"], ["dashboard", "orders", "catalog"])

        staff_prof.refresh_from_db()
        self.assertEqual(staff_prof.sections, ["dashboard", "orders", "catalog"])
        self.assertEqual(staff_prof.custom_sections, ["dashboard", "orders", "catalog"])

        # Resetting with empty sections restores role defaults
        response = self.client.post(url, {"sections": []}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sections"], ["dashboard", "orders", "customers"])
        self.assertEqual(response.data["custom_sections"], [])

