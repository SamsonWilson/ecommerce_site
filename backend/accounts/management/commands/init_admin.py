import os
from django.core.management.base import BaseCommand
from accounts.models import User, StaffProfile


class Command(BaseCommand):
    help = "Crée ou met à jour le mot de passe du compte administrateur par défaut."

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            type=str,
            default=os.environ.get("ADMIN_EMAIL", "admin@maisonlian.com"),
            help="Adresse e-mail de l'administrateur",
        )
        parser.add_argument(
            "--password",
            type=str,
            default=os.environ.get("ADMIN_PASSWORD", "Admin123456!"),
            help="Mot de passe par défaut de l'administrateur",
        )

    def handle(self, *args, **options):
        email = options["email"]
        password = options["password"]

        user, created = User.objects.get_or_create(email=email)
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save()

        # Attribue le profil employé ADMIN si nécessaire
        StaffProfile.objects.update_or_create(
            user=user,
            defaults={
                "role": StaffProfile.Role.ADMIN,
                "job_title": "Administrateur Système",
            },
        )

        action_str = "créé" if created else "mis à jour"
        self.stdout.write(
            self.style.SUCCESS(
                f"Compte administrateur {action_str} avec succès !\n"
                f"  E-mail    : {email}\n"
                f"  Mot de passe : {password}\n"
                f"  Rôle      : Staff ADMIN & Superuser"
            )
        )
