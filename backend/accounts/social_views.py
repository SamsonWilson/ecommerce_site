"""
Connexion par réseaux sociaux (django-allauth + dj-rest-auth).

Deux flux acceptés par ces vues :
  - `access_token` : le frontend a déjà obtenu un jeton via le SDK du fournisseur ;
  - `code` + `callback_url` : flux OAuth par redirection (celui utilisé ici),
    qui évite de charger un SDK tiers dans la page.

Le compte créé est TOUJOURS un compte de détail : le signal
`accounts.signals.ensure_customer_profile` s'en charge, et aucun champ
`account_type` n'est exposé.
"""
from allauth.socialaccount.providers.facebook.views import FacebookOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


class BaseSocialLogin(SocialLoginView):
    """Applique notre politique : refresh uniquement dans le cookie httpOnly."""

    permission_classes = [AllowAny]
    client_class = OAuth2Client

    #: nom du réglage contenant l'identifiant client (pour le message d'erreur)
    provider_name = "ce fournisseur"

    def post(self, request, *args, **kwargs):
        app = settings.SOCIALACCOUNT_PROVIDERS.get(self.provider_id, {}).get("APP", {})
        if not app.get("client_id"):
            return Response(
                {"detail": f"La connexion {self.provider_name} n'est pas configurée sur le serveur."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return super().post(request, *args, **kwargs)

    def get_response(self):
        response = super().get_response()
        if isinstance(response.data, dict):
            response.data.pop("refresh", None)
        return response

    @property
    def callback_url(self):
        # Doit correspondre exactement à l'URI de redirection déclarée chez le
        # fournisseur ET à celle envoyée par le frontend.
        return self.request.data.get("callback_url") or settings.SOCIAL_CALLBACK_URL


class FacebookLogin(BaseSocialLogin):
    adapter_class = FacebookOAuth2Adapter
    provider_id = "facebook"
    provider_name = "Facebook"
