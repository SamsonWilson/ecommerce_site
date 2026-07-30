from rest_framework import serializers
from catalog.models import ProductVariant
from catalog.serializers import VariantSerializer as ProductVariantSerializer
from pricing.services import resolve_price
from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    variant_details = ProductVariantSerializer(source="variant", read_only=True)
    resolved_price = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ("id", "variant", "variant_details", "quantity", "resolved_price", "subtotal", "created_at")

    def get_resolved_price(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        rp = resolve_price(obj.variant, user=user)
        return {
            "unit_price": str(rp.unit_price),
            "currency": rp.currency,
            "original_price": str(rp.original_price) if rp.original_price else None,
            "is_wholesale": rp.is_wholesale,
            "moq": rp.moq,
        }

    def get_subtotal(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        rp = resolve_price(obj.variant, user=user)
        return str(rp.unit_price * obj.quantity)


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_amount = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ("id", "items", "total_amount", "item_count", "updated_at")

    def get_total_amount(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        total = sum(resolve_price(item.variant, user=user).unit_price * item.quantity for item in obj.items.all())
        return str(total)

    def get_item_count(self, obj):
        return sum(item.quantity for item in obj.items.all())
