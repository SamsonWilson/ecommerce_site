from rest_framework import serializers

from pricing.services import resolve_price

from .models import (
    Category,
    Collection,
    ColorTheme,
    Product,
    ProductMedia,
    ProductVariant,
    WeddingMoment,
)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug")


class ColorThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ColorTheme
        fields = ("id", "name", "slug", "hex_code")


class WeddingMomentSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeddingMoment
        fields = ("id", "name", "slug")


class ProductMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductMedia
        fields = ("id", "file", "media_type", "angle", "alt_text", "position")


class VariantSerializer(serializers.ModelSerializer):
    """
    Sérialiseur variante — n'expose JAMAIS `wholesale_price` (§6).
    Le champ `price` provient exclusivement du résolveur.
    """

    price = serializers.SerializerMethodField()
    original_price = serializers.SerializerMethodField()
    is_wholesale = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = ("id", "sku", "attributes", "price", "original_price",
                  "is_wholesale", "moq", "max_order_qty", "stock")

    def _resolved(self, variant):
        user = getattr(self.context.get("request"), "user", None)
        return resolve_price(variant, user=user)

    def get_price(self, variant):
        return str(self._resolved(variant).unit_price)

    def get_original_price(self, variant):
        rp = self._resolved(variant)
        return str(rp.original_price) if rp.original_price is not None else None

    def get_is_wholesale(self, variant):
        return self._resolved(variant).is_wholesale


class ProductListSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", default=None)
    colors = ColorThemeSerializer(many=True, read_only=True)
    price = serializers.SerializerMethodField()
    original_price = serializers.SerializerMethodField()
    sku = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ("id", "name", "slug", "category", "colors", "price",
                  "original_price", "sku", "stock", "is_active")

    def get_sku(self, product):
        v = self._default_variant(product)
        return v.sku if v else None

    def get_stock(self, product):
        v = self._default_variant(product)
        return v.stock if v else 0

    def _default_variant(self, product):
        return product.variants.all()[0] if product.variants.all() else None

    def get_price(self, product):
        v = self._default_variant(product)
        if not v:
            return None
        user = getattr(self.context.get("request"), "user", None)
        return str(resolve_price(v, user=user).unit_price)

    def get_original_price(self, product):
        v = self._default_variant(product)
        if not v:
            return None
        user = getattr(self.context.get("request"), "user", None)
        rp = resolve_price(v, user=user)
        return str(rp.original_price) if rp.original_price is not None else None


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    collection = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    colors = ColorThemeSerializer(many=True, read_only=True)
    wedding_moments = WeddingMomentSerializer(many=True, read_only=True)
    media = ProductMediaSerializer(many=True, read_only=True)
    variants = VariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ("id", "name", "slug", "description", "cultural_story",
                  "category", "collection", "colors", "wedding_moments",
                  "media", "variants", "seo_title", "seo_description")


class CollectionSerializer(serializers.ModelSerializer):
    products = ProductListSerializer(many=True, read_only=True)

    class Meta:
        model = Collection
        fields = ("id", "name", "slug", "story", "products")
