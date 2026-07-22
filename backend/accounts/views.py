from dj_rest_auth.registration.views import RegisterView as BaseRegisterView
from django.conf import settings
from django.contrib.auth import get_user_model
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import UserSerializer

User = get_user_model()


# --- Utilitaires cookie refresh -------------------------------------------

def _set_refresh_cookie(response, refresh_token):
    """Place le refresh token dans un cookie httpOnly (invisible au JS)."""
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=str(refresh_token),
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        path="/api/v1/auth",
    )


def _tokens_response(user):
    """Construit la réponse : access dans le corps, refresh en cookie."""
    refresh = RefreshToken.for_user(user)
    response = Response(
        {"access": str(refresh.access_token), "user": UserSerializer(user).data},
        status=status.HTTP_200_OK,
    )
    _set_refresh_cookie(response, refresh)
    return response


# L'inscription passe désormais par django-allauth (dj-rest-auth) :
# POST /api/v1/auth/registration/ — voir accounts.serializers.SignupSerializer.

# --- Connexion e-mail / mot de passe (cookie refresh) ---------------------

class CookieTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0]) from e
        data = serializer.validated_data
        response = Response({"access": str(data["access"])}, status=status.HTTP_200_OK)
        _set_refresh_cookie(response, data["refresh"])
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """Rejoue le refresh token lu depuis le cookie httpOnly."""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        raw = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if not raw:
            return Response({"detail": "Refresh token absent."}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = self.get_serializer(data={"refresh": raw})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0]) from e
        data = serializer.validated_data
        response = Response({"access": str(data["access"])}, status=status.HTTP_200_OK)
        # Rotation activée : un nouveau refresh est émis, on rafraîchit le cookie.
        if "refresh" in data:
            _set_refresh_cookie(response, data["refresh"])
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_205_RESET_CONTENT)
        response.delete_cookie(settings.REFRESH_COOKIE_NAME, path="/api/v1/auth")
        return response


# --- Profil courant --------------------------------------------------------

class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


# --- Connexion / création via Google --------------------------------------

class GoogleAuthView(APIView):
    """
    Reçoit un ID token Google (Google Identity Services côté frontend),
    le vérifie, puis connecte l'utilisateur — en créant le compte au besoin.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("credential") or request.data.get("id_token")
        if not token:
            return Response({"detail": "ID token Google manquant."}, status=status.HTTP_400_BAD_REQUEST)
        if not settings.GOOGLE_CLIENT_ID:
            return Response({"detail": "GOOGLE_CLIENT_ID non configuré côté serveur."},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            info = id_token.verify_oauth2_token(
                token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )
        except ValueError:
            return Response({"detail": "Token Google invalide."}, status=status.HTTP_401_UNAUTHORIZED)

        if not info.get("email_verified"):
            return Response({"detail": "E-mail Google non vérifié."}, status=status.HTTP_401_UNAUTHORIZED)

        email = info["email"].lower()
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": info.get("given_name", ""),
                "last_name": info.get("family_name", ""),
                "auth_provider": User.AuthProvider.GOOGLE,
            },
        )
        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])
            # Le profil DÉTAIL est créé par le signal accounts.signals.

        response = _tokens_response(user)
        response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return response


# --- Inscription (django-allauth via dj-rest-auth) -------------------------

class RegisterView(BaseRegisterView):
    """
    Inscription allauth. Le refresh token est retiré du corps de la réponse :
    il ne doit vivre que dans le cookie httpOnly, hors de portée du JavaScript.
    """

    def get_response_data(self, user):
        data = super().get_response_data(user)
        if isinstance(data, dict):
            data.pop("refresh", None)
        return data
