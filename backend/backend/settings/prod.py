"""Réglages de production — durcissement sécurité."""
from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False

# Hôtes autorisés fournis par l'environnement (jamais "*").
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

# HTTPS / cookies sécurisés
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")  # derrière nginx
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# CSRF de confiance (domaines servis par l'edge nginx)
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])
