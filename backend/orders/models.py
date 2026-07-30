from django.conf import settings
from django.db import models
from catalog.models import ProductVariant


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente de paiement"
        PAID = "PAID", "Payée"
        PREPARING = "PREPARING", "En préparation"
        SHIPPED = "SHIPPED", "Expédiée"
        DELIVERED = "DELIVERED", "Livrée"
        CANCELLED = "CANCELLED", "Annulée"
        REFUNDED = "REFUNDED", "Remboursée"

    class OrderType(models.TextChoices):
        RETAIL = "RETAIL", "Commande détail"
        WHOLESALE = "WHOLESALE", "Commande gros"

    reference = models.CharField(max_length=32, unique=True)  # CMD-2026-00001
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    email = models.EmailField()
    order_type = models.CharField(max_length=10, choices=OrderType.choices, default=OrderType.RETAIL)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)

    currency = models.CharField(max_length=3, default="EUR")
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=6, default=1.000000)

    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    shipping_address = models.JSONField(default=dict)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.reference} ({self.total_amount} {self.currency})"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT)
    product_name = models.CharField(max_length=200)  # Copie figée du nom au moment de la commande
    sku = models.CharField(max_length=64)            # Copie figée du SKU
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)  # Prix figé
    quantity = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.order.reference} - {self.sku} x {self.quantity}"
