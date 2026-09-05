"""Réglages de production — durcissement sécurité."""
from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False

# Hôtes autorisés (par environnement ou repli sur le domaine du serveur)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["ecommerce.ginolux.com", "localhost", "127.0.0.1", "*"])

# HTTPS / cookies sécurisés
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")  # derrière le proxy inverse
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=False)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=False)
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=0)

# CSRF & CORS de confiance (domaines du serveur distant)
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=["https://ecommerce.ginolux.com", "http://ecommerce.ginolux.com"])
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["https://ecommerce.ginolux.com", "http://ecommerce.ginolux.com"])