from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Envoie un e-mail de test pour vérifier la configuration SMTP."

    def add_arguments(self, parser):
        parser.add_argument("destinataire", help="Adresse à qui envoyer le test")

    def handle(self, *args, **options):
        to = options["destinataire"]

        self.stdout.write("Configuration utilisée :")
        self.stdout.write(f"  backend   : {settings.EMAIL_BACKEND}")
        self.stdout.write(f"  hôte      : {settings.EMAIL_HOST}:{settings.EMAIL_PORT}")
        self.stdout.write(f"  compte    : {settings.EMAIL_HOST_USER or '(aucun)'}")
        self.stdout.write(f"  TLS / SSL : {settings.EMAIL_USE_TLS} / {settings.EMAIL_USE_SSL}")
        self.stdout.write(f"  expéditeur: {settings.DEFAULT_FROM_EMAIL}\n")

        if "console" in settings.EMAIL_BACKEND:
            self.stdout.write(self.style.WARNING(
                "⚠ Backend « console » : le message s'affichera ci-dessous mais ne partira PAS.\n"
                "  Il manque : "
                + ", ".join(n for n, v in (
                    ("EMAIL_HOST", settings.EMAIL_HOST),
                    ("EMAIL_HOST_USER", settings.EMAIL_HOST_USER),
                    ("EMAIL_HOST_PASSWORD", settings.EMAIL_HOST_PASSWORD),
                ) if not v) + " dans le fichier .env."
            ))

        try:
            sent = send_mail(
                subject="Test d'envoi — Maison Lián",
                message="Si vous lisez ce message, la configuration SMTP fonctionne.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to],
                fail_silently=False,
            )
        except Exception as exc:  # noqa: BLE001 — on veut afficher l'erreur telle quelle
            raise CommandError(
                f"Échec de l'envoi : {type(exc).__name__} — {exc}\n\n"
                "Pistes fréquentes :\n"
                "  • Gmail : il faut un « mot de passe d'application » (validation en 2 étapes "
                "activée), pas votre mot de passe habituel.\n"
                "  • Le port 587 exige EMAIL_USE_TLS=True ; le port 465 exige EMAIL_USE_SSL=True.\n"
                "  • Vérifiez que DEFAULT_FROM_EMAIL correspond bien au compte SMTP."
            ) from exc

        if sent:
            self.stdout.write(self.style.SUCCESS(f"✓ Message accepté par le serveur pour {to}."))
        else:
            self.stdout.write(self.style.ERROR("Aucun message envoyé."))
