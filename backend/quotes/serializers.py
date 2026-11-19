from django.utils.translation import get_language
from rest_framework import serializers

from catalog.models import ProductVariant
from payments.transfer import is_approved_wholesaler

from .models import QuoteItem, QuoteRequest
from .services import is_expired


class QuoteItemWriteSerializer(serializers.Serializer):
    """Article demandé : par déclinaison, ou par slug (panier de la boutique)."""

    variant = serializers.PrimaryKeyRelatedField(queryset=ProductVariant.objects.all(), required=False)
    slug = serializers.SlugField(required=False)
    quantity = serializers.IntegerField(min_value=1, max_value=100000)

    def validate(self, attrs):
        variant = attrs.get("variant")
        if variant is None and attrs.get("slug"):
            candidates = ProductVariant.objects.select_related("product").filter(
                product__slug=attrs["slug"], product__is_active=True,
            )
            variant = candidates.filter(stock__gt=0).first() or candidates.first()
        if variant is None:
            raise serializers.ValidationError({"variant": "Article introuvable."})
        qty = attrs["quantity"]
        # Le MOQ est un minimum de gros : il ne s'impose qu'aux grossistes validés.
        request = self.context.get("request")
        if request and is_approved_wholesaler(request.user) and qty < variant.moq:
            raise serializers.ValidationError(
                {"quantity": f"Quantité minimale de {variant.moq} pour la référence {variant.sku}."}
            )
        if variant.max_order_qty and qty > variant.max_order_qty:
            raise serializers.ValidationError(
                {"quantity": f"Quantité maximale de {variant.max_order_qty} pour {variant.sku}."}
            )
        return {"variant": variant, "quantity": qty}


class QuoteItemSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source="variant.sku", read_only=True)
    slug = serializers.CharField(source="variant.product.slug", read_only=True)
    product_name = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = QuoteItem
        fields = ("id", "sku", "slug", "product_name", "quantity", "proposed_unit_price", "line_total")

    def get_product_name(self, obj):
        return obj.variant.product.translated("name")

    def get_line_total(self, obj):
        if obj.proposed_unit_price is None:
            return None
        return str(obj.proposed_unit_price * obj.quantity)


class QuoteCreateSerializer(serializers.ModelSerializer):
    """Dépôt d'une demande de devis (public : client connecté ou non)."""

    items = QuoteItemWriteSerializer(many=True, required=False)

    class Meta:
        model = QuoteRequest
        fields = ("reference", "contact_email", "contact_name", "company",
                  "country", "phone", "message", "items")
        read_only_fields = ("reference",)

    def validate_items(self, items):
        if len(items) > 100:
            raise serializers.ValidationError("100 articles au plus.")
        return items

    def create(self, validated_data):
        items = validated_data.pop("items", [])
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["customer"] = request.user
        validated_data["language"] = get_language() or "fr"
        quote = QuoteRequest.objects.create(**validated_data)
        for item in items:
            QuoteItem.objects.create(quote=quote, **item)
        return quote


class QuoteSerializer(serializers.ModelSerializer):
    """Suivi côté client : le lien du devis n'existe qu'une fois chiffré."""

    items = QuoteItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    link_token = serializers.SerializerMethodField()
    order_reference = serializers.CharField(source="order.reference", default=None, read_only=True)

    class Meta:
        model = QuoteRequest
        fields = ("id", "reference", "status", "status_display", "company",
                  "contact_email", "message", "items", "quoted_total", "shipping_cost",
                  "valid_until", "created_at", "link_token", "order_reference")
        read_only_fields = fields

    def get_link_token(self, obj):
        return obj.public_token or None


class PublicQuoteSerializer(serializers.ModelSerializer):
    """Page du devis ouverte par le lien secret."""

    items = QuoteItemSerializer(many=True, read_only=True)
    expired = serializers.SerializerMethodField()
    order = serializers.SerializerMethodField()

    class Meta:
        model = QuoteRequest
        fields = ("reference", "status", "company", "contact_name", "contact_email", "country",
                  "items", "shipping_cost", "quoted_total", "valid_until", "expired", "order")
        read_only_fields = fields

    def get_expired(self, obj):
        return is_expired(obj)

    def get_order(self, obj):
        if not obj.order_id:
            return None
        # Même destinataire que le devis : il peut suivre et régler sa commande.
        return {"reference": obj.order.reference, "token": obj.order.public_token,
                "status": obj.order.status, "payment_method": obj.order.payment_method}


class AdminQuoteItemSerializer(QuoteItemSerializer):
    variant_id = serializers.IntegerField(read_only=True)
    stock = serializers.IntegerField(source="variant.stock", read_only=True)
    retail_price = serializers.DecimalField(source="variant.retail_price", max_digits=10, decimal_places=2, read_only=True)
    wholesale_price = serializers.DecimalField(source="variant.wholesale_price", max_digits=10, decimal_places=2, read_only=True)

    class Meta(QuoteItemSerializer.Meta):
        fields = QuoteItemSerializer.Meta.fields + ("variant_id", "stock", "retail_price", "wholesale_price")


class AdminQuoteSerializer(serializers.ModelSerializer):
    """Vue back-office. Prix et envoi passent par l'action `send` ; ici, seul le suivi change."""

    MANUAL_STATUSES = (QuoteRequest.Status.NEW, QuoteRequest.Status.IN_REVIEW, QuoteRequest.Status.DECLINED)

    items = AdminQuoteItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    items_count = serializers.IntegerField(source="items.count", read_only=True)
    customer_email = serializers.CharField(source="customer.email", default=None, read_only=True)
    order_reference = serializers.CharField(source="order.reference", default=None, read_only=True)
    order_status = serializers.CharField(source="order.status", default=None, read_only=True)
    expired = serializers.SerializerMethodField()

    class Meta:
        model = QuoteRequest
        fields = ("id", "reference", "contact_email", "contact_name", "company",
                  "country", "phone", "message", "status", "status_display",
                  "quoted_total", "shipping_cost", "valid_until", "sent_at", "expired",
                  "items", "items_count", "customer_email", "order_reference", "order_status", "created_at")
        read_only_fields = tuple(f for f in fields if f != "status")

    def get_expired(self, obj):
        return is_expired(obj)

    def validate_status(self, value):
        current = self.instance.status if self.instance else None
        if value != current and (value not in self.MANUAL_STATUSES or current == QuoteRequest.Status.ACCEPTED):
            raise serializers.ValidationError("Ce statut change par l'envoi ou l'acceptation du devis.")
        return value
