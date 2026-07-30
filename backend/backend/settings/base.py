"""
Réglages communs à tous les environnements.
La configuration sensible passe par des variables d'environnement (django-environ).
"""
from datetime import timedelta
from pathlib import Path

import environ

# backend/backend/settings/base.py -> remonter à backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, "dev-insecure-change-me"),
    ALLOWED_HOSTS=(list, ["*"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:5173"]),
    GOOGLE_CLIENT_ID=(str, ""),
)
# Charge un fichier .env s'il existe (dev local sans Docker)
environ.Env.read_env(BASE_DIR.parent / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",              # requis par allauth
    # Tiers
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    # Création de compte / e-mails / comptes sociaux
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.socialaccount.providers.facebook",
    "dj_rest_auth",
    "dj_rest_auth.registration",
    # Applications locales
    "core",
    "accounts",
    "pricing",
    "catalog",
    "quotes",
    "cart",
    "orders",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",          # statiques en prod
    "corsheaders.middleware.CorsMiddleware",               # avant CommonMiddleware
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

SITE_ID = 1

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",          # admin Django
    "allauth.account.auth_backends.AuthenticationBackend",  # connexion par e-mail
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],   # prioritaire sur les templates des apps
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"

# Base de données — PostgreSQL via DATABASE_URL ; repli SQLite pour le dev local.
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
    )
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr"
TIME_ZONE = "Europe/Paris"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Médias téléversés depuis le back-office (photos produits).
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Taille maximale d'un fichier téléversé (photo produit). Une photo prise au
# téléphone pèse couramment 4 à 8 Mo : en dessous de 10, on refuse des photos
# parfaitement légitimes. nginx accepte jusqu'à 20 Mo (client_max_body_size).
MAX_UPLOAD_SIZE_MB = env.int("MAX_UPLOAD_SIZE_MB", default=10)

# Vidéo de présentation d'un produit : bien plus lourde qu'une photo. Penser à
# aligner `client_max_body_size` dans nginx si vous relevez cette valeur.
MAX_VIDEO_SIZE_MB = env.int("MAX_VIDEO_SIZE_MB", default=50)

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# --- Stockage objet des médias (S3 / Cloudflare R2) ------------------------
# Le disque local ne convient qu'à un seul processus : avec plusieurs réplicas
# backend, chacun n'aurait que les photos qu'il a lui-même reçues. Dès que
# USE_S3=True, les téléversements partent vers le bucket et les URL rendues par
# l'API pointent dessus — le reste du code est inchangé (cf. ARCHITECTURE §3).
USE_S3 = env.bool("USE_S3", default=False)

if USE_S3:
    AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME")
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")
    # R2 et les S3 compatibles exigent une URL d'endpoint ; AWS s3 la déduit
    # de la région, on laisse donc la valeur vide dans ce cas.
    AWS_S3_ENDPOINT_URL = env("AWS_S3_ENDPOINT_URL", default="") or None
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="auto")
    # Domaine public servant les fichiers (CDN R2, CloudFront…). Sans lui,
    # django-storages génère des URL signées qui expirent.
    AWS_S3_CUSTOM_DOMAIN = env("AWS_S3_CUSTOM_DOMAIN", default="") or None

    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": AWS_STORAGE_BUCKET_NAME,
            "access_key": AWS_ACCESS_KEY_ID,
            "secret_key": AWS_SECRET_ACCESS_KEY,
            "endpoint_url": AWS_S3_ENDPOINT_URL,
            "region_name": AWS_S3_REGION_NAME,
            "custom_domain": AWS_S3_CUSTOM_DOMAIN,
            "location": env("AWS_LOCATION", default="media"),
            # Les photos produits sont publiques : pas de signature d'URL, et
            # un cache long puisque les noms de fichiers ne sont pas réutilisés.
            "querystring_auth": False,
            "default_acl": None,     # R2 n'implémente pas les ACL S3
            "file_overwrite": False,
            "object_parameters": {"CacheControl": "public, max-age=31536000"},
        },
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Django REST Framework -------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardPagination",
    "PAGE_SIZE": 12,
}

# --- JWT (simplejwt) -------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
}

# Nom du cookie httpOnly qui porte le refresh token (jamais exposé au JS).
REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_SECURE = env.bool("REFRESH_COOKIE_SECURE", default=not DEBUG)
REFRESH_COOKIE_SAMESITE = "Lax"

# --- CORS ------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True  # nécessaire pour le cookie refresh

# --- Authentification Google ----------------------------------------------
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID")

# --- Connexion par réseaux sociaux ----------------------------------------
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:5173")
SOCIAL_CALLBACK_URL = f"{FRONTEND_URL}/compte/connexion/callback"

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": env("GOOGLE_CLIENT_ID", default=""),
            "secret": env("GOOGLE_CLIENT_SECRET", default=""),
            "key": "",
        },
        "SCOPE": ["profile", "email"],
    },
    "facebook": {
        "APP": {
            "client_id": env("FACEBOOK_APP_ID", default=""),
            "secret": env("FACEBOOK_APP_SECRET", default=""),
            "key": "",
        },
        "SCOPE": ["email", "public_profile"],
        "FIELDS": ["id", "email", "first_name", "last_name"],
    },
}

# Rattache une connexion sociale au compte existant portant le même e-mail,
# au lieu d'échouer sur « e-mail déjà utilisé ».
SOCIALACCOUNT_EMAIL_AUTHENTICATION = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True

# --- django-allauth : création de compte + e-mails -------------------------
# Notre User n'a pas de champ username : l'identifiant est l'e-mail.
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_USER_MODEL_EMAIL_FIELD = "email"
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
ACCOUNT_UNIQUE_EMAIL = True
# "optional" : le compte est utilisable tout de suite, l'e-mail de confirmation
# part quand même. Passer à "mandatory" pour bloquer tant que non confirmé.
ACCOUNT_EMAIL_VERIFICATION = env("ACCOUNT_EMAIL_VERIFICATION", default="optional")
ACCOUNT_RATE_LIMITS = {"login_failed": "5/5m"}  # anti force brute

# --- Envoi des e-mails -----------------------------------------------------
# Tant qu'aucun EMAIL_HOST n'est renseigné, les messages s'affichent dans la
# console (pratique en développement) mais ne partent PAS. Dès qu'un serveur
# SMTP est fourni, on bascule automatiquement sur un envoi réel.
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
EMAIL_TIMEOUT = env.int("EMAIL_TIMEOUT", default=15)

# On ne bascule en envoi réel que si le serveur ET les identifiants sont
# fournis : une configuration incomplète afficherait en console plutôt que de
# faire échouer les inscriptions par une erreur SMTP.
EMAIL_IS_CONFIGURED = bool(EMAIL_HOST and EMAIL_HOST_USER and EMAIL_HOST_PASSWORD)
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default=("django.core.mail.backends.smtp.EmailBackend" if EMAIL_IS_CONFIGURED
             else "django.core.mail.backends.console.EmailBackend"),
)

# Gmail réécrit l'expéditeur s'il ne correspond pas au compte authentifié :
# par défaut on aligne donc l'expéditeur sur l'identifiant SMTP.
DEFAULT_FROM_EMAIL = (
    env("DEFAULT_FROM_EMAIL", default="") or EMAIL_HOST_USER or "contact@maisonlian.com"
)
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# dj-rest-auth : expose l'inscription allauth en API, avec des JWT.
REST_AUTH = {
    "USE_JWT": True,
    "TOKEN_MODEL": None,   # pas de token DRF : on utilise des JWT
    "JWT_AUTH_HTTPONLY": True,                       # refresh en cookie httpOnly
    "JWT_AUTH_REFRESH_COOKIE": REFRESH_COOKIE_NAME,
    "JWT_AUTH_REFRESH_COOKIE_PATH": "/api/v1/auth",  # même portée que nos vues
    "JWT_AUTH_SECURE": REFRESH_COOKIE_SECURE,
    "JWT_AUTH_SAMESITE": REFRESH_COOKIE_SAMESITE,
    "SESSION_LOGIN": False,
    "REGISTER_SERIALIZER": "accounts.serializers.SignupSerializer",
    "PASSWORD_RESET_SERIALIZER": "accounts.serializers.FrontendPasswordResetSerializer",
    "USER_DETAILS_SERIALIZER": "accounts.serializers.UserSerializer",
}
