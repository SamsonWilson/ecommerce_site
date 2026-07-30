from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import CustomerProfile, StaffProfile, User


class CustomerProfileInline(admin.StackedInline):
    model = CustomerProfile
    can_delete = False


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "auth_provider", "is_staff")
    list_filter = ("is_staff", "is_superuser", "auth_provider")
    search_fields = ("email", "first_name", "last_name")
    inlines = [CustomerProfileInline]

    # Formulaires basés sur l'e-mail (pas de username)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Identité", {"fields": ("first_name", "last_name")}),
        ("Préférences", {"fields": ("preferred_language", "preferred_currency", "auth_provider")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),
    )


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "job_title", "delivery_zone", "created_at")
    list_filter = ("role",)
    search_fields = ("user__email", "user__first_name", "user__last_name", "job_title")
    autocomplete_fields = ("user", "created_by")


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "account_type", "status", "company_name", "country")
    list_filter = ("account_type", "status")
    search_fields = ("user__email", "company_name", "vat_number")
    list_editable = ("status",)  # validation B2B en quelques clics (cf. §5.1)
