from rest_framework import serializers

from .models import PriceTier


class PriceTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceTier
        fields = ("id", "name", "discount_percent", "priority")

    def validate_discount_percent(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError("La remise doit être comprise entre 0 et 100 %.")
        return value
