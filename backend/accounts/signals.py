from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CustomerProfile


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def ensure_customer_profile(sender, instance, created, **kwargs):
    """
    Tout nouveau compte est un compte DÉTAIL (B2C), quelle que soit la voie
    d'inscription : formulaire, allauth ou Google.

    Le passage en GROS (B2B) est une décision d'administrateur — il n'existe
    aucun chemin permettant à un client de se déclarer grossiste lui-même.
    """
    if not created or instance.is_staff:
        return
    CustomerProfile.objects.get_or_create(
        user=instance,
        defaults={
            "account_type": CustomerProfile.AccountType.RETAIL,
            # Rien à valider pour un compte de détail : il est utilisable de suite.
            "status": CustomerProfile.Status.APPROVED,
        },
    )
