from django.contrib import admin

from .models import QuoteItem, QuoteRequest


class QuoteItemInline(admin.TabularInline):
    model = QuoteItem
    extra = 0


@admin.register(QuoteRequest)
class QuoteRequestAdmin(admin.ModelAdmin):
    list_display = ("reference", "company", "contact_email", "status", "quoted_total", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("reference", "company", "contact_email")
    list_editable = ("status", "quoted_total")
    readonly_fields = ("reference", "created_at", "updated_at")
    inlines = [QuoteItemInline]
