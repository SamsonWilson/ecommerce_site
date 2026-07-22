from django.contrib import admin

from .models import (
    Category,
    Collection,
    ColorTheme,
    Product,
    ProductMedia,
    ProductVariant,
    WeddingMoment,
)


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


class ProductMediaInline(admin.TabularInline):
    model = ProductMedia
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "collection", "is_active", "sales_channel")
    list_filter = ("is_active", "sales_channel", "category", "collection")
    search_fields = ("name", "slug", "description")
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("wedding_moments", "colors")
    inlines = [ProductVariantInline, ProductMediaInline]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ("sku", "product", "retail_price", "wholesale_price", "stock", "moq")
    search_fields = ("sku", "product__name")


for model in (Category, ColorTheme, WeddingMoment, Collection):
    admin.site.register(
        model,
        type(f"{model.__name__}Admin", (admin.ModelAdmin,), {
            "prepopulated_fields": {"slug": ("name",)},
        }),
    )
