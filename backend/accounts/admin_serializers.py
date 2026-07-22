from rest_framework import serializers

from .models import CustomerProfile


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
