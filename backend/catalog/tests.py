import json
import tempfile
from decimal import Decimal
from io import StringIO
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import anthropic
import httpx2
import requests
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import StaffProfile, User
from catalog.seed_translations import apply_seed_translations
from catalog.translation import pending_objects, translate_objects
from core.translator import TranslatedBatch, TranslatedItem, TranslationError, translate_texts

from .admin_serializers import AdminCategorySerializer, AdminProductSerializer
from orders.models import Order, OrderItem
from pricing.models import PriceTier

from .models import Category, Collection, ColorTheme, Product, ProductVariant, StockMovement


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


class ProductPublicStockVisibilityTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Bijoux", slug="bijoux")
        from django.test import RequestFactory
        self.factory = RequestFactory()

    def test_product_with_stock_gt_0_is_visible(self):
        from .views import public_product_queryset
        prod = Product.objects.create(name="Peigne Doré", slug="peigne-dore", category=self.category, is_active=True)
        ProductVariant.objects.create(product=prod, sku="SKU-PEIGNE-01", retail_price="50.00", wholesale_price="40.00", stock=5)

        req = self.factory.get("/")
        qs = public_product_queryset(req)
        self.assertIn(prod, qs)

    def test_product_with_stock_0_is_hidden(self):
        from .views import public_product_queryset
        prod = Product.objects.create(name="Peigne Épuisé", slug="peigne-epuise", category=self.category, is_active=True)
        ProductVariant.objects.create(product=prod, sku="SKU-PEIGNE-00", retail_price="50.00", wholesale_price="40.00", stock=0)

        req = self.factory.get("/")
        qs = public_product_queryset(req)
        self.assertNotIn(prod, qs)

    def test_product_without_variants_is_hidden(self):
        from .views import public_product_queryset
        prod = Product.objects.create(name="Produit Sans Variante", slug="produit-sans-variante", category=self.category, is_active=True)

        req = self.factory.get("/")
        qs = public_product_queryset(req)
        self.assertNotIn(prod, qs)

    def test_inactive_product_with_stock_is_hidden(self):
        from .views import public_product_queryset
        prod = Product.objects.create(name="Produit Inactif", slug="produit-inactif", category=self.category, is_active=False)
        ProductVariant.objects.create(product=prod, sku="SKU-INACTIF-01", retail_price="30.00", wholesale_price="20.00", stock=10)

        req = self.factory.get("/")
        qs = public_product_queryset(req)
        self.assertNotIn(prod, qs)

    def test_multi_variant_product_visible_if_at_least_one_variant_in_stock(self):
        from .views import public_product_queryset
        prod = Product.objects.create(name="Robe Nuptiale", slug="robe-nuptiale", category=self.category, is_active=True)
        ProductVariant.objects.create(product=prod, sku="SKU-ROBE-S", retail_price="200.00", wholesale_price="150.00", stock=0)
        ProductVariant.objects.create(product=prod, sku="SKU-ROBE-M", retail_price="200.00", wholesale_price="150.00", stock=3)

        req = self.factory.get("/")
        qs = public_product_queryset(req)
        self.assertIn(prod, qs)

    def test_product_becomes_hidden_when_stock_reaches_zero(self):
        from .views import public_product_queryset
        prod = Product.objects.create(name="Tiare Éphémère", slug="tiare-ephemere", category=self.category, is_active=True)
        var = ProductVariant.objects.create(product=prod, sku="SKU-TIARE-01", retail_price="80.00", wholesale_price="60.00", stock=1)

        req = self.factory.get("/")
        self.assertIn(prod, public_product_queryset(req))

        var.stock = 0
        var.save()

        self.assertNotIn(prod, public_product_queryset(req))


class FakeClaude:
    """Remplace le client Claude : traduit chaque texte en « [langue] texte »."""

    def __init__(self, stop_reason="end_turn", drop=()):
        self.calls = []
        self.stop_reason = stop_reason
        self.drop = drop
        self.beta = SimpleNamespace(messages=SimpleNamespace(parse=self.parse))

    def parse(self, **kwargs):
        content = kwargs["messages"][0]["content"]
        self.calls.append(content)
        lang = "zh" if "Chinese" in content.splitlines()[0] else "en"
        items = json.loads(content.split("\n", 1)[1])
        return SimpleNamespace(
            stop_reason=self.stop_reason,
            parsed_output=TranslatedBatch(items=[
                TranslatedItem(key=item["key"], text=f"[{lang}] {item['text']}")
                for item in items if item["key"] not in self.drop
            ]),
        )


@override_settings(ANTHROPIC_API_KEY="test")
class CatalogTranslationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = Category.objects.create(name="Couronnes", slug="couronnes")
        self.color = ColorTheme.objects.create(name="Rouge", slug="rouge")
        self.collection = Collection.objects.create(name="Héritage", slug="heritage", story="Une histoire")
        self.product = Product.objects.create(
            name="Couronne Phénix", slug="couronne-phenix", description="Pièce brodée",
            category=self.category, collection=self.collection,
        )
        self.product.colors.add(self.color)
        ProductVariant.objects.create(
            product=self.product, sku="CP-1", retail_price=Decimal("100.00"),
            wholesale_price=Decimal("60.00"), stock=5,
        )

    def _translate_all(self, fake=None):
        fake = fake or FakeClaude()
        with mock.patch("core.translator._client", return_value=fake):
            call_command("translate_catalog", stdout=StringIO())
        return fake

    def test_visitor_reads_the_catalog_in_their_language(self):
        self._translate_all()

        listing = self.client.get("/api/v1/products/", HTTP_ACCEPT_LANGUAGE="zh").data["results"][0]
        self.assertEqual(listing["name"], "[zh] Couronne Phénix")
        self.assertEqual(listing["category"], "[zh] Couronnes")
        self.assertEqual(listing["colors"][0]["name"], "[zh] Rouge")

        detail = self.client.get("/api/v1/products/couronne-phenix/", HTTP_ACCEPT_LANGUAGE="en").data
        self.assertEqual(detail["description"], "[en] Pièce brodée")
        self.assertEqual(detail["category"]["name"], "[en] Couronnes")

        collection = self.client.get("/api/v1/collections/heritage/", HTTP_ACCEPT_LANGUAGE="zh").data
        self.assertEqual(collection["story"], "[zh] Une histoire")
        self.assertEqual(collection["products"][0]["name"], "[zh] Couronne Phénix")

        categories = self.client.get("/api/v1/categories/", HTTP_ACCEPT_LANGUAGE="zh").data
        self.assertEqual(categories[0]["name"], "[zh] Couronnes")

    def test_french_stays_the_default_and_the_fallback(self):
        self._translate_all()
        self.assertEqual(self.client.get("/api/v1/products/").data["results"][0]["name"], "Couronne Phénix")
        self.assertEqual(
            self.client.get("/api/v1/products/", HTTP_ACCEPT_LANGUAGE="de").data["results"][0]["name"],
            "Couronne Phénix",
        )

    def test_untranslated_product_is_shown_in_french(self):
        listing = self.client.get("/api/v1/products/", HTTP_ACCEPT_LANGUAGE="zh").data["results"][0]
        self.assertEqual(listing["name"], "Couronne Phénix")

    def test_changing_the_french_text_invalidates_only_that_translation(self):
        self._translate_all()
        self.product.description = "Pièce en or"
        self.product.save()

        # Plus de traduction fausse à l'écran : le français reprend le relais.
        detail = self.client.get("/api/v1/products/couronne-phenix/", HTTP_ACCEPT_LANGUAGE="zh").data
        self.assertEqual(detail["description"], "Pièce en or")

        fake = self._translate_all()
        self.assertEqual(len(fake.calls), 2)              # une fois par langue
        self.assertNotIn("Couronnes", "".join(fake.calls))  # la catégorie n'est pas renvoyée
        detail = self.client.get("/api/v1/products/couronne-phenix/", HTTP_ACCEPT_LANGUAGE="zh").data
        self.assertEqual(detail["description"], "[zh] Pièce en or")

    def test_rerun_sends_nothing_when_everything_is_up_to_date(self):
        self._translate_all()
        self.assertEqual(self._translate_all().calls, [])

    def test_incomplete_answer_keeps_the_object_pending(self):
        batch = pending_objects("zh")
        fake = FakeClaude(drop=(f"{batch.index(self.product)}.description",))
        with mock.patch("core.translator._client", return_value=fake):
            done = translate_objects(batch, "zh")

        self.assertEqual(done, len(batch) - 1)
        self.product.refresh_from_db()
        self.assertTrue(self.product.needs_translation("zh"))

    def test_interrupted_answer_is_refused(self):
        for stop_reason in ("refusal", "max_tokens"):
            with mock.patch("core.translator._client", return_value=FakeClaude(stop_reason=stop_reason)):
                with self.assertRaises(TranslationError):
                    translate_texts({"a": "Bonjour"}, "zh")

    def test_translation_losing_a_placeholder_is_dropped(self):
        fake = FakeClaude()
        fake.beta.messages.parse = lambda **kwargs: SimpleNamespace(
            stop_reason="end_turn",
            parsed_output=TranslatedBatch(items=[
                TranslatedItem(key="a", text="你好"),
                TranslatedItem(key="b", text="共 {{count}} 件"),
                TranslatedItem(key="inconnue", text="x"),
            ]),
        )
        with mock.patch("core.translator._client", return_value=fake):
            result = translate_texts({"a": "Bonjour {{name}}", "b": "{{count}} articles"}, "zh")
        self.assertEqual(result, {"b": "共 {{count}} 件"})

    def test_search_finds_products_in_every_language(self):
        self._translate_all()
        found = self.client.get("/api/v1/products/", {"search": "[zh] Couronne"}).data["results"]
        self.assertEqual(len(found), 1)
        # Le JSON n'est pas interrogé : ses clés ne doivent pas tout faire remonter.
        self.assertEqual(self.client.get("/api/v1/products/", {"search": "_hash"}).data["results"], [])

    def test_back_office_keeps_editing_the_french_source(self):
        self._translate_all()
        admin = User.objects.create_superuser(email="root@example.com", password="Password123!")
        self.client.force_authenticate(user=admin)
        response = self.client.get(f"/api/v1/admin/products/{self.product.id}/", HTTP_ACCEPT_LANGUAGE="zh")
        self.assertEqual(response.data["name"], "Couronne Phénix")

    def test_status_reports_real_progress(self):
        admin = User.objects.create_superuser(email="root@example.com", password="Password123!")
        self.client.force_authenticate(user=admin)

        status_before = self.client.get("/api/v1/admin/translations/").data
        self.assertEqual(status_before["remaining"], 8)   # 4 objets x 2 langues
        self._translate_all()
        status_after = self.client.get("/api/v1/admin/translations/").data
        self.assertEqual(status_after["remaining"], 0)

    def test_back_office_translates_batch_by_batch(self):
        admin = User.objects.create_superuser(email="root@example.com", password="Password123!")
        self.client.force_authenticate(user=admin)
        fake = FakeClaude()
        with mock.patch("core.translator._client", return_value=fake):
            first = self.client.post("/api/v1/admin/translations/run/").data
            second = self.client.post("/api/v1/admin/translations/run/").data
            third = self.client.post("/api/v1/admin/translations/run/").data

        self.assertEqual((first["translated"], first["remaining"]), (4, 4))
        self.assertEqual((second["translated"], second["remaining"]), (4, 0))
        self.assertEqual(third["translated"], 0)
        self.assertEqual(len(fake.calls), 2)              # plus rien à envoyer au 3e appel

    def test_only_catalog_staff_can_run_translations(self):
        url = "/api/v1/admin/translations/run/"
        self.assertEqual(self.client.post(url).status_code, status.HTTP_401_UNAUTHORIZED)

        customer = User.objects.create_user(email="c@example.com", password="Password123!")
        self.client.force_authenticate(user=customer)
        self.assertEqual(self.client.post(url).status_code, status.HTTP_403_FORBIDDEN)

        support = User.objects.create_user(email="s@example.com", password="Password123!", is_staff=True)
        StaffProfile.objects.create(user=support, role=StaffProfile.Role.SUPPORT)
        self.client.force_authenticate(user=support)
        self.assertEqual(self.client.post(url).status_code, status.HTTP_403_FORBIDDEN)

    def test_api_failure_changes_nothing(self):
        admin = User.objects.create_superuser(email="root@example.com", password="Password123!")
        self.client.force_authenticate(user=admin)
        failing = FakeClaude()
        failing.beta.messages.parse = mock.Mock(side_effect=anthropic.APIConnectionError(request=mock.Mock()))
        with mock.patch("core.translator._client", return_value=failing):
            response = self.client.post("/api/v1/admin/translations/run/")
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.product.refresh_from_db()
        self.assertEqual(self.product.translations, {})


@override_settings(ANTHROPIC_API_KEY="test")
class TranslatorRequestTests(TestCase):
    """Passe par le vrai SDK avec un faux réseau : vérifie la requête réellement envoyée."""

    def test_request_sent_to_claude_and_parsing_of_the_answer(self):
        sent = {}

        def respond(request):
            sent["headers"] = request.headers
            sent["body"] = json.loads(request.content)
            return httpx2.Response(200, json={
                "id": "msg_1", "type": "message", "role": "assistant", "model": "claude-opus-5-5",
                "content": [{"type": "text", "text": json.dumps({"items": [{"key": "a", "text": "凤冠"}]})}],
                "stop_reason": "end_turn", "stop_sequence": None,
                "usage": {"input_tokens": 1, "output_tokens": 1},
            })

        client = anthropic.Anthropic(
            api_key="test", http_client=anthropic.DefaultHttpxClient(transport=httpx2.MockTransport(respond))
        )
        with mock.patch("core.translator._client", return_value=client):
            result = translate_texts({"a": "Couronne phénix"}, "zh")

        self.assertEqual(result, {"a": "凤冠"})
        body = sent["body"]
        self.assertEqual(body["model"], "claude-opus-5-5")
        self.assertEqual(body["fallbacks"], "default")
        self.assertIn("server-side-fallback-2026-07-01", sent["headers"]["anthropic-beta"])
        self.assertEqual(body["output_config"]["effort"], "high")
        self.assertEqual(body["output_config"]["format"]["type"], "json_schema")
        self.assertIn("Couronne phénix", body["messages"][0]["content"])
        self.assertIn("Simplified Chinese", body["messages"][0]["content"])


@override_settings(ANTHROPIC_API_KEY="test")
class TranslateLocalesCommandTests(TestCase):
    def test_only_missing_keys_are_translated_and_existing_ones_are_kept(self):
        with tempfile.TemporaryDirectory() as root:
            locales = Path(root, "frontend", "src", "i18n", "locales")
            locales.mkdir(parents=True)
            (locales / "fr.json").write_text(json.dumps({"home": {"a": "Accueil", "b": "Panier"}}), encoding="utf-8")
            (locales / "en.json").write_text(json.dumps({"home": {"a": "Home"}}), encoding="utf-8")
            (locales / "zh.json").write_text("{}", encoding="utf-8")

            fake = FakeClaude()
            with override_settings(BASE_DIR=Path(root, "backend")), \
                 mock.patch("core.translator._client", return_value=fake):
                call_command("translate_locales", stdout=StringIO())

            english = json.loads((locales / "en.json").read_text(encoding="utf-8"))
            chinese = json.loads((locales / "zh.json").read_text(encoding="utf-8"))

        self.assertEqual(english, {"home": {"a": "Home", "b": "[en] Panier"}})
        self.assertEqual(chinese, {"home": {"a": "[zh] Accueil", "b": "[zh] Panier"}})


def free_answer(text="凤冠", status_code=200, quota_finished=False):
    return mock.Mock(json=mock.Mock(return_value={
        "responseData": {"translatedText": text},
        "responseStatus": status_code,
        "quotaFinished": quota_finished,
    }))


@override_settings(ANTHROPIC_API_KEY="")
class FreeTranslationTests(TestCase):
    """Sans clé, ce qui est enregistré en français est quand même traduit."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(email="root@example.com", password="Password123!")
        self.product = Product.objects.create(name="Couronne Phénix", slug="couronne-phenix", description="Pièce")
        ProductVariant.objects.create(
            product=self.product, sku="CP-1", retail_price=Decimal("100.00"),
            wholesale_price=Decimal("60.00"), stock=5,
        )

    def test_saved_french_product_shows_in_chinese_without_any_key(self):
        self.client.force_authenticate(user=self.admin)
        with mock.patch("core.translator.requests.get", return_value=free_answer()):
            run = self.client.post("/api/v1/admin/translations/run/")
        self.assertEqual(run.status_code, status.HTTP_200_OK)
        self.assertEqual(run.data["engine"], "free")

        self.client.force_authenticate(user=None)
        listing = self.client.get("/api/v1/products/", HTTP_ACCEPT_LANGUAGE="zh").data["results"][0]
        self.assertEqual(listing["name"], "凤冠")

    def test_a_hairpin_is_not_a_safety_pin(self):
        with mock.patch("core.translator.requests.get", return_value=free_answer("朱砂凤凰别针")):
            self.assertEqual(translate_texts({"a": "Épingle Phénix"}, "zh"), {"a": "朱砂凤凰发簪"})

    def test_a_bridal_crown_is_not_a_funeral_wreath(self):
        with mock.patch("core.translator.requests.get", return_value=free_answer("珍珠婚礼花圈")):
            self.assertEqual(translate_texts({"a": "Couronne de mariée"}, "zh"), {"a": "珍珠婚礼头冠"})

    def test_price_tier_saved_in_french_is_translated(self):
        tier = PriceTier.objects.create(name="Partenaire")
        with mock.patch("core.translator.requests.get", return_value=free_answer("合作伙伴")):
            call_command("translate_catalog", stdout=StringIO())
        tier.refresh_from_db()
        self.assertEqual(tier.translated("name", "zh"), "合作伙伴")

    def test_long_text_is_split_under_the_service_limit(self):
        long_text = " ".join(["Une phrase assez longue pour remplir la requête."] * 30)
        with mock.patch("core.translator.requests.get", return_value=free_answer("句。")) as request:
            result = translate_texts({"a": long_text}, "zh")
        self.assertGreater(request.call_count, 1)
        for call in request.call_args_list:
            self.assertLess(len(call.kwargs["params"]["q"].encode()), 500)
        self.assertEqual(result["a"], "句。" * request.call_count)

    def test_quota_warning_is_never_stored_as_a_translation(self):
        warning = free_answer("MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS", 429)
        with mock.patch("core.translator.requests.get", return_value=warning):
            with self.assertRaisesMessage(TranslationError, "Quota"):
                translate_texts({"a": "Bonjour"}, "zh")

    def test_what_is_done_is_kept_when_the_quota_runs_out(self):
        answers = [free_answer("你好"), free_answer("", quota_finished=True)]
        with mock.patch("core.translator.requests.get", side_effect=answers):
            self.assertEqual(translate_texts({"a": "Bonjour", "b": "Merci"}, "zh"), {"a": "你好"})

    def test_network_failure_is_reported(self):
        with mock.patch("core.translator.requests.get", side_effect=requests.ConnectionError):
            with self.assertRaises(TranslationError):
                translate_texts({"a": "Bonjour"}, "zh")

    def test_free_translations_are_redone_once_a_claude_key_is_added(self):
        with mock.patch("core.translator.requests.get", return_value=free_answer()):
            call_command("translate_catalog", stdout=StringIO())
        self.product.refresh_from_db()
        self.assertEqual(self.product.translations["zh"]["_engine"], "free")
        self.assertFalse(self.product.needs_translation("zh"))
        self.assertNotIn("free", self.product.search_text)

        with override_settings(ANTHROPIC_API_KEY="test"):
            self.assertTrue(self.product.needs_translation("zh"))
            # L'ancienne traduction reste affichée en attendant la nouvelle.
            self.assertEqual(self.product.translated("name", "zh"), "凤冠")
            with mock.patch("core.translator._client", return_value=FakeClaude()):
                call_command("translate_catalog", stdout=StringIO())
            self.product.refresh_from_db()
            self.assertEqual(self.product.translated("name", "zh"), "[zh] Couronne Phénix")
            self.assertNotIn("_engine", self.product.translations["zh"])


class SeedTranslationTests(TestCase):
    def test_known_content_gets_the_reviewed_translation(self):
        category = Category.objects.create(name="Épingles", slug="epingles")
        product = Product.objects.create(
            name="Épingle Phénix Cinabre", slug="epingle-phenix-cinabre",
            description="Épingle Phénix Cinabre — pièce façonnée à la main, collection Héritage.",
            cultural_story="Inspiré des symboles du mariage chinois.", category=category,
        )
        self.assertEqual(apply_seed_translations(), 2)
        product.refresh_from_db()
        self.assertEqual(product.translated("name", "zh"), "朱砂凤凰发簪")
        self.assertEqual(product.translated("description", "zh"), "朱砂凤凰发簪 — 匠心手作，传承系列。")
        self.assertEqual(product.translated("name", "en"), "Cinnabar Phoenix Hairpin")
        self.assertIn("发簪", product.search_text)
        self.assertEqual(apply_seed_translations(), 0)

    def test_edited_content_is_left_to_the_translator(self):
        product = Product.objects.create(name="Épingle Phénix Cinabre", slug="e", description="Texte modifié")
        self.assertEqual(apply_seed_translations(), 0)
        self.assertTrue(product.needs_translation("zh"))


class TranslatedNamesInOrdersAndBackOfficeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(email="root@example.com", password="Password123!")
        self.category = Category.objects.create(name="Épingles", slug="epingles")
        self.category.set_translation("zh", {"name": "发簪"})
        self.category.save()
        self.product = Product.objects.create(name="Couronne", slug="couronne", category=self.category)
        self.product.set_translation("zh", {"name": "凤冠"})
        self.product.save()
        self.variant = ProductVariant.objects.create(
            product=self.product, sku="C-1", retail_price=Decimal("100.00"),
            wholesale_price=Decimal("60.00"), stock=5,
        )

    def test_order_lines_follow_the_language_and_french_keeps_the_frozen_name(self):
        customer = User.objects.create_user(email="c@example.com", password="Password123!")
        order = Order.objects.create(
            reference="CMD-1", customer=customer, email="c@example.com",
            subtotal=Decimal("100"), total_amount=Decimal("100"),
        )
        OrderItem.objects.create(order=order, variant=self.variant, product_name="Ancien nom",
                                 sku="C-1", unit_price=Decimal("100"), quantity=1)
        self.client.force_authenticate(user=customer)

        chinese = self.client.get("/api/v1/orders/", HTTP_ACCEPT_LANGUAGE="zh").data["results"][0]
        self.assertEqual(chinese["items"][0]["product_name"], "凤冠")
        french = self.client.get("/api/v1/orders/").data["results"][0]
        self.assertEqual(french["items"][0]["product_name"], "Ancien nom")

    def test_roles_and_sections_follow_the_language(self):
        self.client.force_authenticate(user=self.admin)
        sections = self.client.get("/api/v1/admin/staff/sections/", HTTP_ACCEPT_LANGUAGE="zh").data
        self.assertEqual(sections[0]["label"], "仪表盘")
        roles = self.client.get("/api/v1/admin/staff/roles/", HTTP_ACCEPT_LANGUAGE="zh").data
        self.assertEqual(roles[0]["label"], "管理员")

    def test_stock_rows_carry_the_product_name(self):
        self.client.force_authenticate(user=self.admin)
        row = self.client.get("/api/v1/admin/stock/", HTTP_ACCEPT_LANGUAGE="zh").data["results"][0]
        self.assertEqual(row["product_name"], "凤冠")

    def test_back_office_shows_the_translation_but_edits_the_french(self):
        self.client.force_authenticate(user=self.admin)
        product = self.client.get(f"/api/v1/admin/products/{self.product.id}/", HTTP_ACCEPT_LANGUAGE="zh").data
        self.assertEqual(product["name"], "Couronne")
        self.assertEqual(product["display_name"], "凤冠")
        self.assertEqual(product["category_name"], "发簪")

        category = self.client.get("/api/v1/admin/categories/", HTTP_ACCEPT_LANGUAGE="zh").data[0]
        self.assertEqual((category["name"], category["display_name"]), ("Épingles", "发簪"))

    def test_stock_history_is_translated(self):
        StockMovement.objects.create(variant=self.variant, quantity_delta=1)
        self.client.force_authenticate(user=self.admin)
        movement = self.client.get("/api/v1/admin/stock-movements/", HTTP_ACCEPT_LANGUAGE="zh").data["results"][0]
        self.assertEqual(movement["product_name"], "凤冠")


@override_settings(ANTHROPIC_API_KEY="")
class FreeTextTranslationTests(TestCase):
    """Médiathèque et promotions : textes saisis en français, sans passer par la base."""

    URL = "/api/v1/admin/translations/texts/"

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=User.objects.create_superuser(email="root@example.com", password="Password123!"))

    def test_saved_text_is_translated(self):
        with mock.patch("core.translator.requests.get", return_value=free_answer("凤舞")):
            response = self.client.post(self.URL, {"lang": "zh", "texts": {"title": "La danse du phénix"}}, format="json")
        self.assertEqual(response.data["translations"], {"title": "凤舞"})

    def test_invalid_requests_are_refused(self):
        for body in ({"lang": "de", "texts": {"a": "b"}}, {"lang": "zh", "texts": "a"}, {"lang": "zh", "texts": {}},
                     {"lang": "zh", "texts": {"a": 1}}, {"lang": "zh", "texts": {"a": "x" * 2001}},
                     {"lang": "zh", "texts": {str(i): "x" for i in range(21)}}):
            self.assertEqual(self.client.post(self.URL, body, format="json").status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_catalog_staff_can_use_it(self):
        self.client.force_authenticate(user=User.objects.create_user(email="c@example.com", password="Password123!"))
        body = {"lang": "zh", "texts": {"a": "b"}}
        self.assertEqual(self.client.post(self.URL, body, format="json").status_code, status.HTTP_403_FORBIDDEN)
