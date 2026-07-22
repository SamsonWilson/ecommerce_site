from rest_framework import generics
from rest_framework.permissions import AllowAny

from accounts.models import CustomerProfile

from .filters import ProductFilter
from .models import Category, Collection, ColorTheme, Product, WeddingMoment
from .serializers import (
    CategorySerializer,
    CollectionSerializer,
    ColorThemeSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    WeddingMomentSerializer,
)


def public_product_queryset(request):
    """
    Produits actifs, filtrés selon le canal de vente (§6) :
      - grossiste validé  -> produits « gros » et « détail et gros »
      - tous les autres   -> produits « détail » et « détail et gros »

    Le filtrage se fait sur le queryset, jamais côté frontend.
    """
    qs = Product.objects.filter(is_active=True).prefetch_related("variants", "colors")
    user = getattr(request, "user", None)
    approved_pro = (
        user
        and user.is_authenticated
        and getattr(user, "profile", None)
        and user.profile.account_type == CustomerProfile.AccountType.WHOLESALE
        and user.profile.status == CustomerProfile.Status.APPROVED
    )
    visible = (
        [Product.SalesChannel.WHOLESALE, Product.SalesChannel.BOTH] if approved_pro
        else [Product.SalesChannel.RETAIL, Product.SalesChannel.BOTH]
    )
    return qs.filter(sales_channel__in=visible)


class ProductListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductListSerializer
    filterset_class = ProductFilter
    search_fields = ("name", "description")
    ordering_fields = ("created_at", "name")
    ordering = ("-created_at",)

    def get_queryset(self):
        return public_product_queryset(self.request).distinct()


class ProductDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return public_product_queryset(self.request).prefetch_related(
            "media", "wedding_moments"
        )


class CategoryListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = CategorySerializer
    queryset = Category.objects.all()


class WeddingMomentListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = WeddingMomentSerializer
    queryset = WeddingMoment.objects.all()


class ColorListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = ColorThemeSerializer
    queryset = ColorTheme.objects.all()


class CollectionDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = CollectionSerializer
    lookup_field = "slug"
    queryset = Collection.objects.all()
