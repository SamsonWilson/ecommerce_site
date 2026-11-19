from django.contrib import admin

from .models import Payment, Refund, WebhookEvent


class RefundInline(admin.TabularInline):
    model = Refund
    extra = 0
    can_delete = False
    readonly_fields = ("amount", "status", "reason", "provider_reference", "created_by", "created_at")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("order", "provider", "status", "amount", "refunded_amount", "currency", "created_at", "paid_at")
    list_filter = ("provider", "status")
    search_fields = ("order__reference", "provider_reference")
    readonly_fields = [f.name for f in Payment._meta.fields]
    inlines = [RefundInline]


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ("provider", "name", "event_id", "received_at")
    list_filter = ("provider", "name")
    readonly_fields = ("provider", "name", "event_id", "payload", "received_at")
