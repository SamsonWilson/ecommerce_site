"""Réglages de développement."""
from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

# En dev on accepte le frontend Vite et l'edge nginx local.
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

# Les e-mails s'affichent dans la console SEULEMENT si aucun serveur SMTP
# n'est configuré. Dès que EMAIL_HOST est renseigné dans le .env, ils partent
# réellement — y compris en développement, pour pouvoir tester la réception.
if not EMAIL_IS_CONFIGURED:  # noqa: F405 (vient de base.py)
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
