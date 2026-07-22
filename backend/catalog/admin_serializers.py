"""
Sérialiseurs du back-office catalogue.

⚠️ Ce sont les SEULS sérialiseurs qui exposent `wholesale_price`. Ils sont
réservés aux comptes `is_staff` (voir AdminProductViewSet). Les sérialiseurs
publics de catalog.serializers ne doivent jamais l'exposer (§6).
"""
from django.utils.text import slugify
from rest_framework import serializers

from .models import Category, ColorTheme, Product, ProductVariant, WeddingMoment


def unique_slug(name, instance=None, model=Product):
    """Génère un slug libre pour `model`, en ignorant l'objet en cours d'édition."""
    base = slugify(name)[:45] or "element"
    slug, i = base, 2
    qs = model.objects.exclude(pk=instance.pk) if instance else model.objects.all()
    while qs.filter(slug=slug).exists():
        slug = f"{base}-{i}"
        i += 1
    return slug


class _SluggedSerializer(serializers.ModelSerializer):
    """
    Base des taxonomies : le slug est facultatif et déduit du nom À LA CRÉATION.

    En modification, un slug laissé vide conserve l'ancien : renommer un rayon
    ne doit jamais changer son URL en douce (liens et référencement cassés).
    Pour changer l'adresse, on saisit explicitement le nouveau slug.
    """

    def validate(self, attrs):
        if not attrs.get("slug"):
            if self.instance:
                attrs.pop("slug", None)          # on garde l'URL existante
            else:
                attrs["slug"] = unique_slug(attrs.get("name", ""), None, self.Meta.model)
        return attrs


class AdminCategorySerializer(_SluggedSerializer):
    # Sert à prévenir avant suppression : combien de produits seront déclassés ?
    product_count = serializers.IntegerField(source="products.count", read_only=True)

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "product_count")
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}


class AdminColorSerializer(_SluggedSerializer):
    product_count = serializers.IntegerField(source="products.count", read_only=True)

    class Meta:
        model = ColorTheme
        fields = ("id", "name", "slug", "hex_code", "product_count")
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}


class AdminMomentSerializer(_SluggedSerializer):
    product_count = serializers.IntegerField(source="products.count", read_only=True)

    class Meta:
        model = WeddingMoment
        fields = ("id", "name", "slug", "product_count")
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}


class AdminVariantSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    # Déclaré à la main pour neutraliser le UniqueValidator automatique :
    # dans une liste imbriquée, il ignore que la déclinaison est mise à jour
    # et refuserait son propre SKU. L'unicité est vérifiée dans validate().
    sku = serializers.CharField(max_length=64)

    class Meta:
        model = ProductVariant
        fields = ("id", "sku", "attributes", "retail_price", "wholesale_price",
                  "moq", "max_order_qty", "stock", "weight_grams", "position")

    def validate(self, attrs):
        retail = attrs.get("retail_price")
        wholesale = attrs.get("wholesale_price")
        # Garde-fou : on inverse très facilement les deux champs à la saisie.
        if retail is not None and wholesale is not None and wholesale > retail:
            raise serializers.ValidationError({
                "wholesale_price": "Le prix de gros ne peut pas dépasser le prix de détail — "
                                   "les deux champs sont-ils inversés ?"
            })

        sku = attrs.get("sku")
        if sku:
            others = ProductVariant.objects.filter(sku=sku)
            current_id = attrs.get("id")
            if current_id:
                others = others.exclude(pk=current_id)
            if others.exists():
                raise serializers.ValidationError(
                    {"sku": "Cette référence (SKU) est déjà utilisée par un autre produit."}
                )
        return attrs


class AdminProductSerializer(serializers.ModelSerializer):
    variants = AdminVariantSerializer(many=True)
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    sales_channel_display = serializers.CharField(source="get_sales_channel_display", read_only=True)

    class Meta:
        model = Product
        fields = ("id", "name", "slug", "description", "cultural_story",
                  "category", "category_name", "collection", "colors", "wedding_moments",
                  "sales_channel", "sales_channel_display", "is_active",
                  "variants", "created_at")
        read_only_fields = ("id", "created_at")
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}

    def validate_variants(self, value):
        if not value:
            raise serializers.ValidationError(
                "Un produit doit avoir au moins une déclinaison (prix, stock, MOQ)."
            )
        return value

    def create(self, validated_data):
        variants = validated_data.pop("variants", [])
        colors = validated_data.pop("colors", [])
        moments = validated_data.pop("wedding_moments", [])
        if not validated_data.get("slug"):
            validated_data["slug"] = unique_slug(validated_data["name"])

        product = Product.objects.create(**validated_data)
        product.colors.set(colors)
        product.wedding_moments.set(moments)
        for v in variants:
            v.pop("id", None)
            ProductVariant.objects.create(product=product, **v)
        return product

    def update(self, instance, validated_data):
        variants = validated_data.pop("variants", None)
        colors = validated_data.pop("colors", None)
        moments = validated_data.pop("wedding_moments", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if colors is not None:
            instance.colors.set(colors)
        if moments is not None:
            instance.wedding_moments.set(moments)

        if variants is not None:
            kept = []
            for v in variants:
                vid = v.pop("id", None)
                if vid and instance.variants.filter(pk=vid).exists():
                    ProductVariant.objects.filter(pk=vid).update(**v)
                    kept.append(vid)
                else:
                    kept.append(ProductVariant.objects.create(product=instance, **v).pk)
            instance.variants.exclude(pk__in=kept).delete()
        return instance
