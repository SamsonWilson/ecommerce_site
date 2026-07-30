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


class StaffProfile(models.Model):
    """
    Fiche employé : rattache un rôle métier à un compte `is_staff`.

    Django distingue déjà `is_staff` (accès au back-office) de `is_superuser`
    (tous les droits). Le rôle vient au-dessus : il décide des écrans visibles
    dans /gestion. Seul un ADMIN peut créer un employé et changer son rôle —
    voir accounts.permissions.IsStaffAdmin.
    """

    class Role(models.TextChoices):
        ADMIN = "ADMIN", _("Administrateur")
        MANAGER = "MANAGER", _("Responsable boutique")
        CATALOG = "CATALOG", _("Gestionnaire catalogue")
        SALES = "SALES", _("Commercial B2B")
        SUPPORT = "SUPPORT", _("Service client")
        DELIVERY = "DELIVERY", _("Livreur")

    # Écrans du back-office ouverts à chaque rôle. `ADMIN` a tout, y compris
    # la gestion de l'équipe — c'est le seul rôle qui porte "staff".
    ROLE_SECTIONS = {
        Role.ADMIN: ("dashboard", "orders", "customers", "promotions", "b2b",
                     "catalog", "deliveries", "staff", "settings"),
        Role.MANAGER: ("dashboard", "orders", "customers", "promotions", "b2b",
                       "catalog", "deliveries"),
        Role.CATALOG: ("dashboard", "catalog"),
        Role.SALES: ("dashboard", "b2b", "customers", "orders"),
        Role.SUPPORT: ("dashboard", "orders", "customers"),
        Role.DELIVERY: ("deliveries",),
    }

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="staff_profile")
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.SUPPORT)
    phone = models.CharField(_("téléphone"), max_length=40, blank=True)
    job_title = models.CharField(_("intitulé de poste"), max_length=120, blank=True)

    # Spécifique aux livreurs : zone couverte et moyen de transport.
    delivery_zone = models.CharField(_("zone de livraison"), max_length=120, blank=True)
    vehicle = models.CharField(_("véhicule"), max_length=60, blank=True)

    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="staff_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("employé")
        verbose_name_plural = _("employés")
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.user.email} — {self.get_role_display()}"

    @property
    def sections(self):
        """Sections du back-office autorisées pour ce rôle."""
        if self.user.is_superuser:
            return list(self.ROLE_SECTIONS[self.Role.ADMIN])
        return list(self.ROLE_SECTIONS.get(self.role, ()))
