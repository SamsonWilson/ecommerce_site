from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from catalog.models import Product, ProductVariant
from orders.models import Order

from .models import ShippingMethod, ShippingZone

CHECKOUT = "/api/v1/checkout/"
OPTIONS = "/api/v1/shipping/options/"


class ShippingTests(TestCase):
    """Grille par défaut (migration 0002) : 6,90 € offert dès 150 €, express 12,90 €, retrait gratuit en France."""

    def setUp(self):
        self.client = APIClient()
        product = Product.objects.create(name="Couronne", slug="couronne")
        self.variant = ProductVariant.objects.create(
            product=product, sku="COU-1", retail_price=Decimal("50.00"),
            wholesale_price=Decimal("30.00"), stock=50, weight_grams=80,
        )

    def order(self, country="FR", method="standard", quantity=1, **extra):
        return self.client.post(CHECKOUT, {
            "email": "client@example.com",
            "items": [{"slug": "couronne", "quantity": quantity}],
            "shipping_address": {"country": country, "city": "Ville"},
            "shipping_method": method,
            "payment_method": "cod",
            **extra,
        }, format="json")

    def assertCharged(self, response, shipping, total):
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        order = Order.objects.get(reference=response.data["order"]["reference"])
        self.assertEqual(order.shipping_cost, Decimal(shipping))
        self.assertEqual(order.total_amount, Decimal(total))
        return order

    def assertRefused(self, response):
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.assertNotIn("order", response.data)

    # --- Tarifs ---

    def test_standard_is_charged_below_threshold_and_free_above(self):
        self.assertCharged(self.order(quantity=2), "6.90", "106.90")
        self.assertCharged(self.order(quantity=3), "0.00", "150.00")

    def test_express_and_pickup(self):
        self.assertCharged(self.order(method="express", quantity=4), "12.90", "212.90")
        order = self.assertCharged(self.order(method="pickup"), "0.00", "50.00")
        self.assertEqual(order.shipping_address["method"], "pickup")

    def test_country_code_is_normalized_and_stored(self):
        order = self.assertCharged(self.order(country=" ca "), "6.90", "56.90")
        self.assertEqual(order.shipping_address["country"], "CA")

    def test_browser_cannot_choose_its_shipping_cost(self):
        self.assertCharged(self.order(shipping_cost="0.00", total_amount="1.00"), "6.90", "56.90")

    # --- Refus ---

    def test_unserved_or_invalid_country_is_refused(self):
        for country in ("US", "France", "", None, ["FR"]):
            self.assertRefused(self.order(country=country))

    def test_pickup_only_in_france(self):
        self.assertRefused(self.order(country="BE", method="pickup"))

    def test_unknown_or_inactive_method_is_refused(self):
        self.assertRefused(self.order(method="teleportation"))
        self.assertRefused(self.order(method=None))
        ShippingMethod.objects.filter(code="express").update(is_active=False)
        self.assertRefused(self.order(method="express"))

    def test_cash_on_delivery_follows_the_method(self):
        ShippingMethod.objects.filter(code="express").update(cash_on_delivery=False)
        self.assertRefused(self.order(method="express"))

    def test_online_card_payment_is_refused_until_a_provider_exists(self):
        for method in ("card", "paypal"):
            self.assertRefused(self.order(payment_method=method))

    def test_weight_and_value_limits(self):
        # Colis postal léger : 1 kg maximum et 100 € de valeur maximum.
        postal = ShippingMethod.objects.create(
            code="postal", name="Colissimo", price=Decimal("4.50"),
            max_weight_grams=1000, max_order_value=Decimal("100.00"), cash_on_delivery=True,
        )
        postal.zones.add(ShippingZone.objects.get(name="France"))
        self.assertCharged(self.order(method="postal", quantity=2), "4.50", "104.50")      # 160 g, 100 €
        self.assertRefused(self.order(method="postal", quantity=3))                         # 150 € : trop cher
        self.variant.weight_grams = 600
        self.variant.save()
        self.assertRefused(self.order(method="postal", quantity=2))                         # 1,2 kg : trop lourd

    # --- API de devis ---

    def test_options_match_what_the_checkout_charges(self):
        response = self.client.post(OPTIONS, {"country": "FR", "items": [{"slug": "couronne", "quantity": 2}]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        options = {option["code"]: option for option in response.data["options"]}
        self.assertEqual(list(options), ["standard", "express", "pickup"])
        self.assertEqual(options["standard"]["cost"], "6.90")
        self.assertEqual(response.data["subtotal"], "100.00")
        self.assertEqual(response.data["weight_grams"], 160)
        self.assertCharged(self.order(quantity=2), options["standard"]["cost"], "106.90")

    def test_options_outside_france_have_no_pickup(self):
        response = self.client.post(OPTIONS, {"country": "CA", "items": [{"slug": "couronne", "quantity": 1}]}, format="json")
        self.assertEqual([o["code"] for o in response.data["options"]], ["standard", "express"])

    def test_options_are_translated(self):
        response = self.client.post(
            OPTIONS, {"country": "FR", "items": [{"slug": "couronne", "quantity": 1}]},
            format="json", HTTP_ACCEPT_LANGUAGE="zh",
        )
        self.assertEqual(response.data["options"][0]["name"], "标准配送")

    def test_options_reject_malformed_requests(self):
        for payload in ({}, {"country": "FR"}, {"country": "FR", "items": []}, {"country": "XX1", "items": [{}]}):
            self.assertEqual(self.client.post(OPTIONS, payload, format="json").status_code, 400)

    def test_served_countries(self):
        response = self.client.get("/api/v1/shipping/countries/")
        self.assertEqual(response.data["countries"], ["BE", "CA", "CH", "FR"])
