"""
Sérialiseurs du back-office catalogue.

⚠️ Ce sont les SEULS sérialiseurs qui exposent `wholesale_price`. Ils sont
réservés aux comptes `is_staff` (voir AdminProductViewSet). Les sérialiseurs
publics de catalog.serializers ne doivent jamais l'exposer (§6).
"""
from django.conf import settings
from django.utils.text import slugify
from rest_framework import serializers

from .models import (
    Category,
    ColorTheme,
    Product,
    ProductMedia,
    ProductVariant,
    WeddingMoment,
)

# Marques ISO-BMFF (l'octet 4..8 vaut « ftyp ») : la marque distingue une image
# AVIF d'une photo iPhone HEIC et d'une vidéo MP4/QuickTime.
_AVIF_BRANDS = {b"avif", b"avis"}
_HEIC_BRANDS = {b"heic", b"heix", b"heif", b"hevc", b"mif1", b"msf1"}
_MP4_BRANDS = {b"isom", b"iso2", b"iso4", b"iso5", b"iso6", b"mp41", b"mp42",
               b"avc1", b"M4V ", b"dash", b"qt  "}


def detect_media_format(upload):
    """
    Reconnaît le format d'après le contenu du fichier, pas d'après le type
    annoncé par le navigateur : celui-ci varie selon l'OS et le navigateur
    (« image/jpg », « application/octet-stream », voire vide selon la source),
    et un rejet là-dessus donne un refus incompréhensible côté back-office.

    Renvoie une clé de format, ou None si le fichier n'est pas reconnu.
    """
    upload.seek(0)
    head = upload.read(32)
    upload.seek(0)

    # --- Images ---
    if head[:3] == b"\xff\xd8\xff":
        return "jpeg"
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"

    # --- Vidéos ---
    if head[:4] == b"\x1a\x45\xdf\xa3":     # conteneur EBML : WebM / Matroska
        return "webm"
    if head[:4] == b"OggS":
        return "ogg"

    # --- Famille ISO-BMFF : image ou vidéo selon la marque ---
    if head[4:8] == b"ftyp":
        brand = head[8:12]
        if brand in _AVIF_BRANDS:
            return "avif"
        if brand in _HEIC_BRANDS:
            return "heic"
        if brand in _MP4_BRANDS:
            return "mp4"
        return "mp4"   # marque MP4 inconnue : on reste permissif
    return None


# Formats lisibles par tous les navigateurs : ces fichiers finissent dans une
# balise <img> ou <video> de la boutique publique.
WEB_IMAGE_FORMATS = {"jpeg", "png", "gif", "webp", "avif"}
WEB_VIDEO_FORMATS = {"mp4", "webm", "ogg"}


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


class AdminProductMediaSerializer(serializers.ModelSerializer):
    """Photo d'un produit. `file` est renvoyé en URL absolue pour l'aperçu."""

    class Meta:
        model = ProductMedia
        fields = ("id", "file", "media_type", "angle", "alt_text", "position")
        read_only_fields = ("id",)

    def validate_file(self, upload):
        detected = detect_media_format(upload)

        if detected == "heic":
            raise serializers.ValidationError(
                "photo iPhone au format HEIC, que les navigateurs n'affichent pas. "
                "Sur l'iPhone : Réglages > Appareil photo > Formats > « Le plus "
                "compatible », ou convertissez-la en JPEG."
            )
        if detected not in WEB_IMAGE_FORMATS | WEB_VIDEO_FORMATS:
            raise serializers.ValidationError(
                "ce fichier n'est ni une image (JPEG, PNG, GIF, WebP, AVIF) "
                "ni une vidéo (MP4, WebM)"
            )

        # Une vidéo pèse légitimement bien plus lourd qu'une photo.
        is_video = detected in WEB_VIDEO_FORMATS
        max_mb = settings.MAX_VIDEO_SIZE_MB if is_video else settings.MAX_UPLOAD_SIZE_MB
        if upload.size > max_mb * 1024 * 1024:
            kind = "vidéo" if is_video else "image"
            raise serializers.ValidationError(
                f"{kind} trop lourde ({upload.size / 1024 / 1024:.1f} Mo), "
                f"maximum {max_mb} Mo"
            )

        # Retenu pour validate() : c'est le contenu qui décide du type, pas
        # l'extension ni ce que déclare le navigateur.
        self._detected_format = detected
        return upload

    def validate(self, attrs):
        detected = getattr(self, "_detected_format", None)
        if detected:
            attrs["media_type"] = (
                ProductMedia.MediaType.VIDEO if detected in WEB_VIDEO_FORMATS
                else ProductMedia.MediaType.IMAGE
            )
        return attrs


class AdminProductSerializer(serializers.ModelSerializer):
    variants = AdminVariantSerializer(many=True)
    media = AdminProductMediaSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    sales_channel_display = serializers.CharField(source="get_sales_channel_display", read_only=True)

    class Meta:
        model = Product
        fields = ("id", "name", "slug", "description", "cultural_story",
                  "category", "category_name", "collection", "colors", "wedding_moments",
                  "sales_channel", "sales_channel_display", "is_active",
                  "variants", "media", "created_at")
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
