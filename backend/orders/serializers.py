from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ("id", "variant", "product_name", "sku", "unit_price", "quantity", "line_total")

    def get_line_total(self, obj):
        return str(obj.unit_price * obj.quantity)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    order_type_display = serializers.CharField(source="get_order_type_display", read_only=True)
    customer_name = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()

    delivery_driver_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "reference",
            "email",
            "customer",
            "customer_name",
            "order_type",
            "order_type_display",
            "status",
            "status_display",
            "currency",
            "subtotal",
            "shipping_cost",
            "tax_amount",
            "total_amount",
            "shipping_address",
            "delivery_driver",
            "delivery_driver_name",
            "delivery_pin",
            "payment_method",
            "items",
            "items_count",
            "stripe_payment_intent_id",
            "created_at",
            "updated_at",
        )

    def get_delivery_driver_name(self, obj):
        if obj.delivery_driver:
            return obj.delivery_driver.get_full_name() or obj.delivery_driver.email
        return None

    def get_customer_name(self, obj):
        if obj.customer:
            return obj.customer.get_full_name() or obj.customer.email
        return obj.shipping_address.get("full_name") or obj.email

    def get_items_count(self, obj):
        return sum(item.quantity for item in obj.items.all())

