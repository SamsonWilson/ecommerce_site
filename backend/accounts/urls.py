from dj_rest_auth.views import PasswordResetConfirmView, PasswordResetView
from django.urls import path

from .social_views import FacebookLogin
from .views import (
    AuthConfigView,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    GoogleAuthView,
    LogoutView,
    MeView,
)

urlpatterns = [
    path("config/", AuthConfigView.as_view(), name="auth-config"),
    path("login/", CookieTokenObtainPairView.as_view(), name="auth-login"),
    path("refresh/", CookieTokenRefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("google/", GoogleAuthView.as_view(), name="auth-google"),
    # Mot de passe oublié : demande puis confirmation avec le jeton reçu par e-mail
    path("password/reset/", PasswordResetView.as_view(), name="password-reset"),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("facebook/", FacebookLogin.as_view(), name="auth-facebook"),
]
