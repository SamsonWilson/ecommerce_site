from rest_framework import serializers

from catalog.models import ProductVariant

from .models import QuoteItem, QuoteRequest


class QuoteItemWriteSerializer(serializers.ModelSerializer):
    variant = serializers.PrimaryKeyRelatedField(queryset=ProductVariant.objects.all())

    class Meta:
        model = QuoteItem
        fields = ("variant", "quantity")

    def validate(self, attrs):
        """MOQ et quantité max revalidés côté serveur — jamais sur la seule foi du formulaire."""
        variant, qty = attrs["variant"], attrs["quantity"]
        if qty < variant.moq:
            raise serializers.ValidationError(
                {"quantity": f"Quantité minimale de {variant.moq} pour la référence {variant.sku}."}
            )
        if variant.max_order_qty and qty > variant.max_order_qty:
            raise serializers.ValidationError(
                {"quantity": f"Quantité maximale de {variant.max_order_qty} pour {variant.sku}."}
            )
        return attrs


class QuoteItemSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source="variant.sku", read_only=True)
    product_name = serializers.CharField(source="variant.product.name", read_only=True)

    class Meta:
        model = QuoteItem
        fields = ("id", "sku", "product_name", "quantity", "proposed_unit_price")


class QuoteCreateSerializer(serializers.ModelSerializer):
    """Dépôt d'une demande de devis (public : client connecté ou non)."""

    items = QuoteItemWriteSerializer(many=True, required=False)

    class Meta:
        model = QuoteRequest
        fields = ("reference", "contact_email", "contact_name", "company",
                  "country", "phone", "message", "items")
        read_only_fields = ("reference",)

    def create(self, validated_data):
        items = validated_data.pop("items", [])
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["customer"] = request.user
        quote = QuoteRequest.objects.create(**validated_data)
        for item in items:
            QuoteItem.objects.create(quote=quote, **item)
        return quote


class QuoteSerializer(serializers.ModelSerializer):
    """Suivi côté client."""

    items = QuoteItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = QuoteRequest
        fields = ("id", "reference", "status", "status_display", "company",
                  "contact_email", "message", "items", "quoted_total",
                  "valid_until", "created_at")
        read_only_fields = fields


class AdminQuoteSerializer(serializers.ModelSerializer):
    """Vue back-office : l'équipe chiffre et fait avancer le devis."""

    items = QuoteItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    items_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = QuoteRequest
        fields = ("id", "reference", "contact_email", "contact_name", "company",
                  "country", "phone", "message", "status", "status_display",
                  "quoted_total", "valid_until", "items", "items_count", "created_at")
        # Seuls le statut, le montant chiffré et la validité sont modifiables.
        read_only_fields = ("id", "reference", "contact_email", "contact_name",
                            "company", "country", "phone", "message",
                            "items", "items_count", "created_at")
