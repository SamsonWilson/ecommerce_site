from django.db import models

# NOTE multilingue : pour rester dans le périmètre de cette étape, les contenus
# sont mono-langue (fr). L'internationalisation structurelle des contenus produits
# (django-parler, cf. ARCHITECTURE.md §5.3) est l'évolution prévue ensuite.


class Category(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)

    class Meta:
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class ColorTheme(models.Model):
    name = models.CharField(max_length=60)
    slug = models.SlugField(unique=True)
    hex_code = models.CharField(max_length=7, default="#000000")  # pour le filtre

    def __str__(self):
        return self.name


class WeddingMoment(models.Model):
    """Cérémonie, réception, dîner, séance photo… (ARCHITECTURE.md §5.3)."""

    name = models.CharField(max_length=80)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name


class Collection(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    story = models.TextField(blank=True)  # storytelling / inspiration

    def __str__(self):
        return self.name


class Product(models.Model):
    class SalesChannel(models.TextChoices):
        """Canal de vente : à qui le produit est-il proposé ?"""
        BOTH = "BOTH", "Détail et gros"
        RETAIL = "RETAIL", "Détail uniquement"
        WHOLESALE = "WHOLESALE", "Gros uniquement"

    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    cultural_story = models.TextField(blank=True)  # origine, philosophie du design

    category = models.ForeignKey(Category, null=True, on_delete=models.SET_NULL, related_name="products")
    collection = models.ForeignKey(Collection, null=True, blank=True, on_delete=models.SET_NULL, related_name="products")
    wedding_moments = models.ManyToManyField(WeddingMoment, blank=True, related_name="products")
    colors = models.ManyToManyField(ColorTheme, blank=True, related_name="products")

    seo_title = models.CharField(max_length=200, blank=True)
    seo_description = models.TextField(blank=True)

    sales_channel = models.CharField(
        max_length=10, choices=SalesChannel.choices, default=SalesChannel.BOTH,
        help_text="Détermine qui voit ce produit : clients au détail, grossistes validés, ou les deux.",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.name


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    sku = models.CharField(max_length=64, unique=True)
    attributes = models.JSONField(default=dict, blank=True)  # {"taille": "M", "métal": "or"}

    # Prix en devise de base (EUR). wholesale_price n'est JAMAIS sérialisé au public.
    retail_price = models.DecimalField(max_digits=10, decimal_places=2)
    wholesale_price = models.DecimalField(max_digits=10, decimal_places=2)

    moq = models.PositiveIntegerField(default=1)           # quantité minimale de commande
    max_order_qty = models.PositiveIntegerField(null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    weight_grams = models.PositiveIntegerField(default=0)

    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("position", "id")

    def __str__(self):
        return f"{self.product.name} — {self.sku}"


class ProductMedia(models.Model):
    class MediaType(models.TextChoices):
        IMAGE = "IMAGE", "Image"
        VIDEO = "VIDEO", "Vidéo"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="media")
    file = models.FileField(upload_to="products/")
    media_type = models.CharField(max_length=6, choices=MediaType.choices, default=MediaType.IMAGE)
    angle = models.CharField(max_length=40, blank=True)   # face, profil, détail, porté
    alt_text = models.CharField(max_length=200, blank=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("position", "id")

    def __str__(self):
        return f"{self.product.name} [{self.media_type}]"
