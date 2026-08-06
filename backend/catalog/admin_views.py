from accounts.permissions import HasStaffSection
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .admin_serializers import (
    AdminCategorySerializer,
    AdminColorSerializer,
    AdminMomentSerializer,
    AdminProductMediaSerializer,
    AdminProductSerializer,
    AdminVariantSerializer,
    StockMovementSerializer,
)
from .models import Category, ColorTheme, Product, ProductVariant, StockMovement, WeddingMoment


class AdminStockViewSet(viewsets.ModelViewSet):
    """
    Gestion dédiée des stocks pour les variantes de produits.
    """

    permission_classes = [HasStaffSection]
    required_section = "catalog"
    queryset = ProductVariant.objects.select_related("product", "product__category").all().order_by("stock", "sku")
    serializer_class = AdminVariantSerializer
    filterset_fields = ["product__category"]
    search_fields = ["sku", "product__name"]

    @action(detail=True, methods=["post"], url_path="adjust")
    def adjust_stock(self, request, pk=None):
        variant = self.get_object()
        delta = request.data.get("delta")
        new_stock = request.data.get("new_stock")
        reason = request.data.get("reason", StockMovement.Reason.CORRECTION)
        reference = request.data.get("reference", "")

        if delta is not None:
            try:
                delta = int(delta)
            except ValueError:
                return Response({"detail": "Delta invalide."}, status=status.HTTP_400_BAD_REQUEST)
            variant.stock = max(0, variant.stock + delta)
        elif new_stock is not None:
            try:
                new_stock = int(new_stock)
            except ValueError:
                return Response({"detail": "Stock invalide."}, status=status.HTTP_400_BAD_REQUEST)
            delta = new_stock - variant.stock
            variant.stock = max(0, new_stock)
        else:
            return Response({"detail": "Précisez delta ou new_stock."}, status=status.HTTP_400_BAD_REQUEST)

        variant.save(update_fields=["stock"])
        movement = StockMovement.objects.create(
            variant=variant,
            quantity_delta=delta,
            reason=reason,
            reference=reference,
        )
        return Response({
            "variant_id": variant.id,
            "sku": variant.sku,
            "stock": variant.stock,
            "movement": StockMovementSerializer(movement).data
        })


class AdminStockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Historique des mouvements de stock.
    """

    permission_classes = [HasStaffSection]
    required_section = "catalog"
    queryset = StockMovement.objects.select_related("variant", "variant__product").all().order_by("-created_at")
    serializer_class = StockMovementSerializer
    filterset_fields = ["reason", "variant"]
    search_fields = ["variant__sku", "variant__product__name", "reference"]



class AdminProductViewSet(viewsets.ModelViewSet):
    """
    Gestion complète du catalogue (is_staff uniquement).
    Seule voie exposant les prix de gros — voir catalog/admin_serializers.py.
    """

    permission_classes = [HasStaffSection]
    required_section = "catalog"
    serializer_class = AdminProductSerializer
    queryset = (
        Product.objects.all()
        .select_related("category")
        .prefetch_related("variants", "colors", "wedding_moments")
        .order_by("-created_at")
    )
    filterset_fields = ["sales_channel", "is_active", "category"]
    search_fields = ["name", "slug", "description", "variants__sku"]

    def get_queryset(self):
        return super().get_queryset().prefetch_related("media")

    @action(detail=True, methods=["post"], url_path="media",
            parser_classes=[MultiPartParser, FormParser])
    def add_media(self, request, pk=None):
        """
        Ajoute une photo au produit (multipart : champ `file`).

        La photo est placée en dernière position ; c'est la première qui sert
        de vignette dans la boutique.
        """
        product = self.get_object()
        serializer = AdminProductMediaSerializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        last = product.media.order_by("-position").first()
        serializer.save(
            product=product,
            position=(last.position + 1) if last else 0,
            alt_text=serializer.validated_data.get("alt_text") or product.name,
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"media/(?P<media_id>\d+)")
    def delete_media(self, request, pk=None, media_id=None):
        """Retire une photo — le fichier est supprimé du stockage avec elle."""
        product = self.get_object()
        media = product.media.filter(pk=media_id).first()
        if media is None:
            return Response({"detail": "Photo introuvable."}, status=status.HTTP_404_NOT_FOUND)
        media.file.delete(save=False)
        media.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class _TaxonomyViewSet(viewsets.ModelViewSet):
    """CRUD des taxonomies du catalogue (catégories, coloris, moments)."""

    permission_classes = [HasStaffSection]
    required_section = "catalog"
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
