from django.contrib.auth.password_validation import validate_password
from django.utils.crypto import get_random_string
from rest_framework import serializers

from .models import CustomerProfile, StaffProfile, User


class AdminCustomerSerializer(serializers.ModelSerializer):
    """Vue back-office d'un compte client (B2C ou B2B)."""

    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.SerializerMethodField()
    price_tier_name = serializers.CharField(source="price_tier.name", read_only=True, default=None)
    account_type_display = serializers.CharField(source="get_account_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = (
            "id", "email", "full_name",
            "account_type", "account_type_display",
            "status", "status_display",
            "price_tier", "price_tier_name",
            "company_name", "vat_number", "country", "created_at",
        )
        # L'équipe ne modifie que le statut et le palier depuis cet écran.
        read_only_fields = ("id", "email", "full_name", "company_name",
                            "vat_number", "country", "created_at")

    def get_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.email

    def validate(self, attrs):
        account_type = attrs.get("account_type", self.instance.account_type if self.instance else None)
        price_tier = attrs.get("price_tier", self.instance.price_tier if self.instance else None)
        # Un palier tarifaire n'a de sens que pour un compte professionnel.
        if price_tier and account_type != CustomerProfile.AccountType.WHOLESALE:
            raise serializers.ValidationError(
                {"price_tier": "Un palier tarifaire ne peut être affecté qu'à un compte professionnel."}
            )
        return attrs


class AdminStaffSerializer(serializers.ModelSerializer):
    """Fiche employé vue du back-office (lecture + modification)."""

    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", required=False, allow_blank=True)
    last_name = serializers.CharField(source="user.last_name", required=False, allow_blank=True)
    is_active = serializers.BooleanField(source="user.is_active", required=False)
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    sections = serializers.ListField(read_only=True)
    last_login = serializers.DateTimeField(source="user.last_login", read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True, default=None)

    class Meta:
        model = StaffProfile
        fields = (
            "id", "email", "first_name", "last_name", "is_active",
            "role", "role_display", "sections",
            "phone", "job_title", "delivery_zone", "vehicle",
            "last_login", "created_at", "created_by_email",
        )
        read_only_fields = ("id", "email", "created_at", "created_by_email", "last_login")

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        for field, value in user_data.items():
            setattr(instance.user, field, value)
        if user_data:
            instance.user.save(update_fields=list(user_data))
        return super().update(instance, validated_data)


class AdminStaffCreateSerializer(serializers.Serializer):
    """
    Création d'un compte employé par l'administrateur.

    Le compte est créé directement actif et `is_staff` : c'est un compte interne,
    il ne passe pas par la confirmation e-mail des clients. Si aucun mot de passe
    n'est fourni, un mot de passe temporaire est généré et renvoyé UNE SEULE FOIS.
    """

    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=StaffProfile.Role.choices)
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True)
    job_title = serializers.CharField(max_length=120, required=False, allow_blank=True)
    delivery_zone = serializers.CharField(max_length=120, required=False, allow_blank=True)
    vehicle = serializers.CharField(max_length=60, required=False, allow_blank=True)

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cette adresse.")
        return email

    def validate_password(self, value):
        if value:
            validate_password(value)
        return value

    def create(self, validated_data):
        raw_password = validated_data.pop("password", "") or get_random_string(12)
        role = validated_data.pop("role")
        user = User.objects.create_user(
            email=validated_data.pop("email"),
            password=raw_password,
            first_name=validated_data.pop("first_name", ""),
            last_name=validated_data.pop("last_name", ""),
            is_staff=True,
            is_active=True,
        )
        profile = StaffProfile.objects.create(
            user=user,
            role=role,
            created_by=self.context["request"].user,
            **validated_data,
        )
        # Communiqué à l'admin une seule fois, à la création : jamais relu ensuite.
        profile.generated_password = raw_password
        return profile

    def to_representation(self, instance):
        data = AdminStaffSerializer(instance, context=self.context).data
        data["generated_password"] = getattr(instance, "generated_password", None)
        return data
