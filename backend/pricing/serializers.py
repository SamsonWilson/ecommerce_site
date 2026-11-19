from rest_framework import serializers

from .models import PriceTier


class PriceTierSerializer(serializers.ModelSerializer):
    # `name` reste le français saisi ; `display_name` suit la langue de l'écran.
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = PriceTier
        fields = ("id", "name", "display_name", "discount_percent", "priority")

    def get_display_name(self, obj):
        return obj.translated("name")

    def validate_discount_percent(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError("La remise doit être comprise entre 0 et 100 %.")
        return value
