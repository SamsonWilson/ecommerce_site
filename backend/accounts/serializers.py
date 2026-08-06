from dj_rest_auth.registration.serializers import RegisterSerializer as BaseRegisterSerializer
from dj_rest_auth.serializers import PasswordResetSerializer
from django.conf import settings
from allauth.account.utils import user_pk_to_url_str
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import CustomerProfile
from .permissions import staff_sections

User = get_user_model()


class CustomerProfileSerializer(serializers.ModelSerializer):
    account_type_display = serializers.CharField(source="get_account_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = (
            "account_type", "account_type_display",
            "status", "status_display",
            "company_name", "vat_number", "country",
        )
        read_only_fields = ("status",)  # la validation B2B se fait en back-office


class UserSerializer(serializers.ModelSerializer):
    """Profil renvoyé par /auth/me/ — jamais le mot de passe."""

    profile = CustomerProfileSerializer(read_only=True)
    # Rôle employé : c'est lui qui décide des écrans affichés dans /gestion.
    role = serializers.CharField(source="staff_profile.role", read_only=True, default=None)
    role_display = serializers.CharField(
        source="staff_profile.get_role_display", read_only=True, default=None
    )
    sections = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "email", "first_name", "last_name",
            "preferred_language", "preferred_currency",
            "auth_provider", "is_staff", "profile",
            "role", "role_display", "sections",
        )
        read_only_fields = ("id", "email", "auth_provider", "is_staff")

    def get_sections(self, obj):
        return staff_sections(obj)


class SignupSerializer(BaseRegisterSerializer):
    """
    Inscription via django-allauth (e-mail de confirmation automatique).

    SÉCURITÉ : aucun champ `account_type` n'est exposé. Tout compte créé est
    un compte DÉTAIL ; seul un administrateur peut activer le statut grossiste
    (POST /api/v1/admin/customers/{id}/to-wholesale/).
    """

    # Notre modèle User n'a pas de username : on retire le champ hérité.
    username = None

    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)

    def validate_email(self, email):
        email = email.lower().strip()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cette adresse e-mail.")
        return email

    def get_cleaned_data(self):
        return {
            "email": self.validated_data.get("email", ""),
            "password1": self.validated_data.get("password1", ""),
            "first_name": self.validated_data.get("first_name", ""),
            "last_name": self.validated_data.get("last_name", ""),
        }


def frontend_reset_url(request, user, temp_key):
    """
    Construit le lien de réinitialisation vers la SPA (et non vers Django) :
    c'est le frontend qui affiche le formulaire de nouveau mot de passe.

    L'identifiant est encodé avec l'utilitaire d'allauth : c'est celui qu'emploie
    la vue de confirmation pour le relire (dj-rest-auth bascule sur le décodeur
    allauth dès que celui-ci est installé). Utiliser l'encodage de Django ici
    ferait échouer la validation du couple uid/token.
    """
    uid = user_pk_to_url_str(user)
    return f"{settings.FRONTEND_URL}/compte/mot-de-passe/{uid}/{temp_key}"


class FrontendPasswordResetSerializer(PasswordResetSerializer):
    """Réinitialisation de mot de passe, avec un lien pointant vers la boutique."""

    def get_email_options(self):
        return {"url_generator": frontend_reset_url}
