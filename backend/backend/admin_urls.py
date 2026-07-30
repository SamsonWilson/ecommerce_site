"""API d'administration — toutes les routes exigent un compte is_staff."""
from rest_framework.routers import DefaultRouter

from accounts.admin_views import AdminCustomerViewSet, AdminStaffViewSet
from catalog.admin_views import (
    AdminCategoryViewSet,
    AdminColorViewSet,
    AdminMomentViewSet,
    AdminProductViewSet,
)
from pricing.views import PriceTierViewSet
from quotes.views import AdminQuoteViewSet

router = DefaultRouter()
router.register("customers", AdminCustomerViewSet, basename="admin-customer")
router.register("staff", AdminStaffViewSet, basename="admin-staff")
router.register("products", AdminProductViewSet, basename="admin-product")
router.register("categories", AdminCategoryViewSet, basename="admin-category")
router.register("colors", AdminColorViewSet, basename="admin-color")
router.register("wedding-moments", AdminMomentViewSet, basename="admin-moment")
router.register("price-tiers", PriceTierViewSet, basename="admin-price-tier")
router.register("quotes", AdminQuoteViewSet, basename="admin-quote")

urlpatterns = router.urls
