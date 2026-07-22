from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from catalog.models import (
    Category,
    Collection,
    ColorTheme,
    Product,
    ProductVariant,
    WeddingMoment,
)

CATEGORIES = ["Épingles", "Épingles & peignes", "Éventails", "Bracelets",
              "Boucles d'oreilles", "Diadèmes & tiares"]
COLORS = [("Ivoire", "#F3E7D8"), ("Or", "#B08A34"), ("Rouge cinabre", "#A5293B"),
          ("Jade", "#435C4E"), ("Argent", "#C9CBD0")]
MOMENTS = ["Cérémonie", "Réception", "Dîner", "Séance photo"]

# slug, nom, catégorie, prix de détail, coloris ; slugs alignés sur le mock frontend.
PRODUCTS = [
    ("epingle-phenix-cinabre", "Épingle Phénix Cinabre", "Épingles", "128", ["Rouge cinabre", "Or"]),
    ("eventail-brode-pivoine", "Éventail Brodé Pivoine", "Éventails", "72", ["Rouge cinabre"]),
    ("peigne-laque-rouge", "Peigne Laque Rouge", "Épingles & peignes", "79", ["Rouge cinabre", "Or"]),
    ("bracelet-jade-or", "Bracelet Jade & Or", "Bracelets", "104", ["Jade", "Or"]),
    ("pendants-perle-jade", "Pendants Perle de Jade", "Boucles d'oreilles", "68", ["Jade"]),
    ("tiare-xiuhe-doree", "Tiare Xiuhe Dorée", "Diadèmes & tiares", "142", ["Or"]),
    ("epingle-double-bonheur", "Épingle Double Bonheur", "Épingles & peignes", "98", ["Or", "Rouge cinabre"]),
    ("eventail-soie-rouge", "Éventail Soie Rouge", "Éventails", "66", ["Rouge cinabre"]),
    ("diademe-perles-douces", "Diadème Perles Douces", "Diadèmes & tiares", "96", ["Argent", "Ivoire"]),
    ("boucles-larme-cristal", "Boucles Larme de Cristal", "Boucles d'oreilles", "54", ["Argent"]),
]


class Command(BaseCommand):
    help = "Crée un jeu de données catalogue de démonstration (idempotent)."

    def handle(self, *args, **options):
        cats = {name: Category.objects.get_or_create(slug=slugify(name), defaults={"name": name})[0]
                for name in CATEGORIES}
        colors = {name: ColorTheme.objects.get_or_create(
            slug=slugify(name), defaults={"name": name, "hex_code": hexc})[0]
            for name, hexc in COLORS}
        for name in MOMENTS:
            WeddingMoment.objects.get_or_create(slug=slugify(name), defaults={"name": name})

        collection, _ = Collection.objects.get_or_create(
            slug="lotus-dor",
            defaults={"name": "Lotus d'Or", "story": "Le lotus s'ouvre au-dessus de l'eau trouble sans en garder trace."},
        )

        created = 0
        for slug, name, cat_name, retail, color_names in PRODUCTS:
            product, is_new = Product.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "category": cats[cat_name],
                    "collection": collection,
                    "description": f"{name} — pièce façonnée à la main, collection Héritage.",
                    "cultural_story": "Inspiré des symboles du mariage chinois.",
                    "is_active": True,
                    "sales_channel": Product.SalesChannel.BOTH,
                },
            )
            product.colors.set([colors[c] for c in color_names])

            retail_d = Decimal(retail)
            sku = "ML-" + slug.upper().replace("-", "")[:12] + "-01"
            ProductVariant.objects.update_or_create(
                sku=sku,
                defaults={
                    "product": product,
                    "retail_price": retail_d,
                    "wholesale_price": (retail_d * Decimal("0.6")).quantize(Decimal("0.01")),
                    "moq": 12,
                    "stock": 50,
                    "weight_grams": 80,
                },
            )
            created += 1 if is_new else 0

        self.stdout.write(self.style.SUCCESS(
            f"Catalogue prêt : {Product.objects.count()} produits ({created} nouveaux)."
        ))
