"""Routage racine du projet backend."""
from django.contrib import admin
from django.urls import include, path

from core.views import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health, name="health"),          # sonde load balancer
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/auth/registration/", include("accounts.registration_urls")),
    path("accounts/", include("allauth.urls")),   # liens de confirmation e-mail
    path("api/v1/admin/", include("backend.admin_urls")),   # réservé is_staff
    path("api/v1/quotes/", include("quotes.urls")),
    path("api/v1/", include("catalog.urls")),
]
