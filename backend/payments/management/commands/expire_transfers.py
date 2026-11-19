from django.core.management.base import BaseCommand

from payments.transfer import expire_unpaid_transfers


class Command(BaseCommand):
    help = "Annule les commandes par virement non réglées à l'échéance et rend leur stock (à lancer chaque jour)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Affiche sans rien annuler.")

    def handle(self, *args, dry_run=False, **options):
        references = expire_unpaid_transfers(dry_run=dry_run)
        verb = "à annuler" if dry_run else "annulées"
        self.stdout.write(f"{len(references)} commande(s) {verb} : {', '.join(references) or '—'}")
