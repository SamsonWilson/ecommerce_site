from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class QuoteRequest(models.Model):
    """Demande de devis B2B (cf. ARCHITECTURE.md §5.4)."""

    class Status(models.TextChoices):
        NEW = "NEW", _("Nouveau")
        IN_REVIEW = "IN_REVIEW", _("En étude")
        QUOTED = "QUOTED", _("Chiffré")
        ACCEPTED = "ACCEPTED", _("Accepté")
        DECLINED = "DECLINED", _("Refusé")

    reference = models.CharField(max_length=20, unique=True, editable=False)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="quotes",
    )  # null = demande faite sans compte

    # Coordonnées figées au moment de la demande
    contact_email = models.EmailField()
    contact_name = models.CharField(max_length=120, blank=True)
    company = models.CharField(max_length=200, blank=True)
    country = models.CharField(max_length=60, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    message = models.TextField(blank=True)

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.NEW)
    quoted_total = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.reference} — {self.company or self.contact_email}"

    def save(self, *args, **kwargs):
        if not self.reference:
            year = timezone.now().year
            prefix = f"DEV-{year}-"
            last = (
                QuoteRequest.objects.filter(reference__startswith=prefix)
                .order_by("-reference").values_list("reference", flat=True).first()
            )
            seq = int(last.rsplit("-", 1)[-1]) + 1 if last else 1
            self.reference = f"{prefix}{seq:05d}"
        super().save(*args, **kwargs)


class QuoteItem(models.Model):
    quote = models.ForeignKey(QuoteRequest, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    # Prix négocié par l'équipe commerciale (null tant que le devis n'est pas chiffré)
    proposed_unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"{self.quote.reference} — {self.variant.sku} x{self.quantity}"
