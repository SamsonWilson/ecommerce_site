from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


class User(AbstractUser):
    """Utilisateur identifié par e-mail (cf. ARCHITECTURE.md §5.1)."""

    class AuthProvider(models.TextChoices):
        EMAIL = "EMAIL", _("E-mail")
        GOOGLE = "GOOGLE", _("Google")

    username = None  # on supprime le username : login par e-mail
    email = models.EmailField(_("adresse e-mail"), unique=True)

    preferred_language = models.CharField(max_length=5, default="fr")
    preferred_currency = models.CharField(max_length=3, default="EUR")
    auth_provider = models.CharField(
        max_length=10, choices=AuthProvider.choices, default=AuthProvider.EMAIL
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # email + password suffisent (createsuperuser)

    objects = UserManager()

    def __str__(self):
        return self.email


class CustomerProfile(models.Model):
    """Profil client B2C / B2B (cf. ARCHITECTURE.md §5.1)."""

    class AccountType(models.TextChoices):
        RETAIL = "RETAIL", _("Particulier")
        WHOLESALE = "WHOLESALE", _("Professionnel")

    class Status(models.TextChoices):
        PENDING = "PENDING", _("En attente")
        APPROVED = "APPROVED", _("Validé")
        REJECTED = "REJECTED", _("Refusé")

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    account_type = models.CharField(
        max_length=10, choices=AccountType.choices, default=AccountType.RETAIL
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    price_tier = models.ForeignKey(
        "pricing.PriceTier", null=True, blank=True, on_delete=models.SET_NULL
    )
    company_name = models.CharField(max_length=255, blank=True)
    vat_number = models.CharField(max_length=32, blank=True)
    country = models.CharField(max_length=2, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} ({self.get_account_type_display()})"
