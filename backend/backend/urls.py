"""Routage racine du projet backend."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from core.views import health, spa_index

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health, name="health"),          # sonde load balancer
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/auth/registration/", include("accounts.registration_urls")),
    path("accounts/", include("allauth.urls")),   # liens de confirmation e-mail
    path("api/v1/admin/", include("backend.admin_urls")),   # réservé is_staff
    path("api/v1/quotes/", include("quotes.urls")),
    path("api/v1/cart/", include("cart.urls")),
    path("api/v1/", include("orders.urls")),
    path("api/v1/", include("catalog.urls")),
]

# Service des médias (photos produits)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# SPA fallback pour toutes les routes du frontend React (hors static & media)
urlpatterns += [
    re_path(r"^(?!static/|media/).*", spa_index),
]
