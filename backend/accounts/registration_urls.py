"""Inscription allauth — notre vue d'abord, puis les routes de confirmation."""
from django.urls import include, path

from .views import RegisterView

urlpatterns = [
    path("", RegisterView.as_view(), name="rest_register"),
    path("", include("dj_rest_auth.registration.urls")),
]
