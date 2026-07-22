from django.urls import path

from .views import (
    CategoryListView,
    CollectionDetailView,
    ColorListView,
    ProductDetailView,
    ProductListView,
    WeddingMomentListView,
)

urlpatterns = [
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<slug:slug>/", ProductDetailView.as_view(), name="product-detail"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("wedding-moments/", WeddingMomentListView.as_view(), name="moment-list"),
    path("colors/", ColorListView.as_view(), name="color-list"),
    path("collections/<slug:slug>/", CollectionDetailView.as_view(), name="collection-detail"),
]
