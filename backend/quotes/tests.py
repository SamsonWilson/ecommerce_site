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
