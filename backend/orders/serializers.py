from rest_framework import serializers

from core.translator import SOURCE_LANGUAGE, current_language

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ("id", "variant", "product_name", "sku", "unit_price", "quantity", "line_total")

    def get_line_total(self, obj):
        return str(obj.unit_price * obj.quantity)

    def to_representation(self, obj):
        data = super().to_representation(obj)
        # En français, on garde le nom figé à la commande : c'est l'historique.
        if current_language() != SOURCE_LANGUAGE:
            data["product_name"] = obj.variant.product.translated("name")
        return data


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    order_type_display = serializers.CharField(source="get_order_type_display", read_only=True)
    customer_name = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()

    delivery_driver_name = serializers.SerializerMethodField()
    cashier_name = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()
    payment_alert = serializers.SerializerMethodField()
    bank_transfer = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "reference",
            "email",
            "customer",
            "customer_name",
            "cashier_name",
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
            "payments",
            "payment_alert",
            "bank_transfer",
            "payment_deadline",
            "created_at",
            "updated_at",
        )
        # Montants et moyen de paiement : fixés par le checkout, jamais retouchés
        # à la main (un paiement en ligne est comparé au total de la commande).
        read_only_fields = (
            "reference", "customer", "email", "order_type", "currency", "subtotal",
            "tax_amount", "total_amount", "payment_method", "delivery_pin", "payment_deadline",
        )

    def get_delivery_driver_name(self, obj):
        if obj.delivery_driver:
            return obj.delivery_driver.get_full_name() or obj.delivery_driver.email
        return None

    def get_cashier_name(self, obj):
        if isinstance(obj.shipping_address, dict):
            return obj.shipping_address.get("cashier_name") or obj.shipping_address.get("cashier")
        return None

    def get_customer_name(self, obj):
        if obj.customer:
            return obj.customer.get_full_name() or obj.customer.email
        # Une ancienne commande mal formée ne doit pas faire planter toute la liste.
        address = obj.shipping_address if isinstance(obj.shipping_address, dict) else {}
        return address.get("full_name") or obj.email

    def get_payments(self, obj):
        from payments.providers import PROVIDERS

        return [
            {
                "id": p.pk, "provider": p.provider, "status": p.status, "amount": str(p.amount),
                "refunded_amount": str(p.refunded_amount),
                # Un virement se rembourse à la banque, pas depuis le site.
                "refundable_amount": str(p.refundable_amount if p.provider in PROVIDERS else 0),
                "currency": p.currency, "reference": p.provider_reference,
                "created_at": p.created_at, "paid_at": p.paid_at,
            }
            for p in obj.payments.all()
        ]

    def get_bank_transfer(self, obj):
        from payments.transfer import instructions

        return instructions(obj)

    def get_payment_alert(self, obj):
        from payments.services import payment_alert

        return payment_alert(obj)

    def get_items_count(self, obj):
        return sum(item.quantity for item in obj.items.all())

