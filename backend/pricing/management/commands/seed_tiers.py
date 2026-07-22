from django.core.management.base import BaseCommand

from pricing.models import PriceTier

TIERS = [
    ("Revendeur", 0, 1),        # tarif de gros de base
    ("Distributeur", 10, 2),    # -10 % sur le tarif de gros
    ("Grand compte", 20, 3),    # -20 % sur le tarif de gros
]


class Command(BaseCommand):
    help = "Crée les paliers tarifaires professionnels (idempotent)."

    def handle(self, *args, **options):
        for name, discount, priority in TIERS:
            PriceTier.objects.update_or_create(
                name=name, defaults={"discount_percent": discount, "priority": priority}
            )
        self.stdout.write(self.style.SUCCESS(f"{PriceTier.objects.count()} paliers tarifaires prêts."))
