from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ("id", "variant", "product_name", "sku", "unit_price", "quantity")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "reference",
            "email",
            "order_type",
            "status",
            "currency",
            "subtotal",
            "shipping_cost",
            "tax_amount",
            "total_amount",
            "shipping_address",
            "items",
            "created_at",
        )
