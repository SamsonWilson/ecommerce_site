from django.db import models


class PriceTier(models.Model):
    """Niveau tarifaire professionnel (cf. ARCHITECTURE.md §5.2)."""

    name = models.CharField(max_length=50)  # "Revendeur", "Distributeur", "VIP"
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    priority = models.IntegerField(default=0)

    class Meta:
        ordering = ("priority",)

    def __str__(self):
        return f"{self.name} (-{self.discount_percent}%)"
