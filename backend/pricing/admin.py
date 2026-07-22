from django.contrib import admin

from .models import PriceTier


@admin.register(PriceTier)
class PriceTierAdmin(admin.ModelAdmin):
    list_display = ("name", "discount_percent", "priority")
    ordering = ("priority",)
