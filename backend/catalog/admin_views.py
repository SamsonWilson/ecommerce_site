from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from .admin_serializers import (
    AdminCategorySerializer,
    AdminColorSerializer,
    AdminMomentSerializer,
    AdminProductSerializer,
)
from .models import Category, ColorTheme, Product, WeddingMoment


class AdminProductViewSet(viewsets.ModelViewSet):
    """
    Gestion complète du catalogue (is_staff uniquement).
    Seule voie exposant les prix de gros — voir catalog/admin_serializers.py.
    """

    permission_classes = [IsAdminUser]
    serializer_class = AdminProductSerializer
    queryset = (
        Product.objects.all()
        .select_related("category")
        .prefetch_related("variants", "colors", "wedding_moments")
        .order_by("-created_at")
    )
    filterset_fields = ["sales_channel", "is_active", "category"]
    search_fields = ["name", "slug", "description", "variants__sku"]


class _TaxonomyViewSet(viewsets.ModelViewSet):
    """CRUD des taxonomies du catalogue (catégories, coloris, moments)."""

    permission_classes = [IsAdminUser]
    pagination_class = None
    search_fields = ["name", "slug"]


class AdminCategoryViewSet(_TaxonomyViewSet):
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.all().order_by("name")


class AdminColorViewSet(_TaxonomyViewSet):
    serializer_class = AdminColorSerializer
    queryset = ColorTheme.objects.all().order_by("name")


class AdminMomentViewSet(_TaxonomyViewSet):
    serializer_class = AdminMomentSerializer
    queryset = WeddingMoment.objects.all().order_by("name")
