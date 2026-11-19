from django.contrib import admin

from .models import ShippingMethod, ShippingZone


@admin.register(ShippingZone)
class ShippingZoneAdmin(admin.ModelAdmin):
    list_display = ("name", "countries")


@admin.register(ShippingMethod)
class ShippingMethodAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "price", "free_from", "max_weight_grams", "carrier", "cash_on_delivery", "is_active")
    list_editable = ("price", "free_from", "is_active")
    filter_horizontal = ("zones",)
