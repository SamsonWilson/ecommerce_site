import os
from io import StringIO
from unittest import mock

from django.core import mail
from django.core.management import call_command
from django.core.management.base import CommandError
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


class InitAdminCommandTests(TestCase):
    """Aucun compte ni mot de passe par défaut, et aucun compte existant écrasé."""

    PASSWORD = "Xk9-pour-les-tests-uniquement"

    def _run(self, email="admin@example.com", password=None):
        env = {k: v for k, v in os.environ.items() if k not in ("ADMIN_EMAIL", "ADMIN_PASSWORD")}
        if password:
            env["ADMIN_PASSWORD"] = password
        out = StringIO()
        with mock.patch.dict(os.environ, env, clear=True), \
             mock.patch("accounts.management.commands.init_admin.sys.stdin") as stdin:
            stdin.isatty.return_value = False
            args = ["--email", email] if email else []
            call_command("init_admin", *args, stdout=out)
        return out.getvalue()

    def test_creates_admin_and_never_prints_the_password(self):
        output = self._run(password=self.PASSWORD)

        user = User.objects.get(email="admin@example.com")
        self.assertTrue(user.is_superuser and user.is_staff)
        self.assertTrue(user.check_password(self.PASSWORD))
        self.assertEqual(user.staff_profile.role, StaffProfile.Role.ADMIN)
        self.assertNotIn(self.PASSWORD, output)

    def test_requires_an_email(self):
        with self.assertRaises(CommandError):
            self._run(email=None, password=self.PASSWORD)
        self.assertEqual(User.objects.count(), 0)

    def test_requires_a_password_when_there_is_no_terminal(self):
        with self.assertRaises(CommandError):
            self._run()
        self.assertEqual(User.objects.count(), 0)

    def test_refuses_a_weak_password(self):
        with self.assertRaises(CommandError):
            self._run(password="12345678")
        self.assertEqual(User.objects.count(), 0)

    def test_existing_account_is_left_untouched(self):
        existing = User.objects.create_user(email="admin@example.com", password="Password123!")

        self._run(password=self.PASSWORD)

        existing.refresh_from_db()
        self.assertTrue(existing.check_password("Password123!"))
        self.assertFalse(existing.is_staff or existing.is_superuser)

    def _run_in_terminal(self, *typed):
        env = {k: v for k, v in os.environ.items() if k not in ("ADMIN_EMAIL", "ADMIN_PASSWORD")}
        with mock.patch.dict(os.environ, env, clear=True), \
             mock.patch("accounts.management.commands.init_admin.sys.stdin") as stdin, \
             mock.patch("accounts.management.commands.init_admin.getpass.getpass", side_effect=typed):
            stdin.isatty.return_value = True
            call_command("init_admin", "--email", "admin@example.com", stdout=StringIO())

    def test_asks_for_the_password_in_a_terminal(self):
        self._run_in_terminal(self.PASSWORD, self.PASSWORD)
        self.assertTrue(User.objects.get(email="admin@example.com").check_password(self.PASSWORD))

    def test_refuses_mismatched_confirmation(self):
        with self.assertRaises(CommandError):
            self._run_in_terminal(self.PASSWORD, "autre-chose")
        self.assertEqual(User.objects.count(), 0)


class CustomerLanguageTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="mei@example.com", password="Password123!", first_name="Mei")

    def test_password_reset_email_follows_the_visitor_language(self):
        response = self.client.post(
            "/api/v1/auth/password/reset/", {"email": "mei@example.com"}, format="json", HTTP_ACCEPT_LANGUAGE="zh",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        message = mail.outbox[0]
        self.assertIn("重置您的密码", message.subject)
        self.assertIn("Mei，您好：", message.body)
        self.assertIn("/compte/mot-de-passe/", message.body)

    def test_password_reset_email_stays_french_by_default(self):
        self.client.post("/api/v1/auth/password/reset/", {"email": "mei@example.com"}, format="json")
        self.assertIn("Bonjour Mei,", mail.outbox[0].body)

    def test_duplicate_signup_error_is_translated(self):
        response = self.client.post("/api/v1/auth/registration/", {
            "email": "mei@example.com", "password1": "Xy9-Secret-88", "password2": "Xy9-Secret-88",
        }, format="json", HTTP_ACCEPT_LANGUAGE="zh")
        self.assertEqual(response.data["email"][0], "该邮箱已注册账户。")
