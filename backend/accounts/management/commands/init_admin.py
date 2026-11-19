import getpass
import os
import sys

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import StaffProfile, User


class Command(BaseCommand):
    help = (
        "Crée le compte administrateur initial. Ne modifie jamais un compte existant : "
        "pour changer un mot de passe, utilisez `manage.py changepassword <e-mail>`."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            type=str,
            default=os.environ.get("ADMIN_EMAIL"),
            help="Adresse e-mail de l'administrateur (ou variable ADMIN_EMAIL)",
        )

    def handle(self, *args, **options):
        email = (options["email"] or "").strip().lower()
        if not email:
            raise CommandError("Indiquez l'adresse : --email ou variable ADMIN_EMAIL.")

        if User.objects.filter(email__iexact=email).exists():
            self.stdout.write(f"Le compte {email} existe déjà : aucune modification.")
            return

        password = self._read_password()
        try:
            validate_password(password, user=User(email=email))
        except ValidationError as exc:
            raise CommandError(" ".join(exc.messages)) from exc

        with transaction.atomic():
            user = User.objects.create_superuser(email=email, password=password)
            StaffProfile.objects.create(
                user=user,
                role=StaffProfile.Role.ADMIN,
                job_title="Administrateur Système",
            )

        self.stdout.write(self.style.SUCCESS(f"Compte administrateur {email} créé."))

    def _read_password(self):
        # Jamais en argument : il resterait dans l'historique du shell et dans `ps`.
        password = os.environ.get("ADMIN_PASSWORD")
        if password:
            return password
        if not sys.stdin.isatty():
            raise CommandError(
                "Mot de passe manquant : définissez ADMIN_PASSWORD "
                "ou lancez la commande dans un terminal."
            )
        password = getpass.getpass("Mot de passe : ")
        if password != getpass.getpass("Confirmation : "):
            raise CommandError("Les deux mots de passe ne correspondent pas.")
        return password
