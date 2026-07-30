from django.urls import path
from .views import CartViewSet

urlpatterns = [
    path("", CartViewSet.as_view({"get": "list"}), name="cart-detail"),
    path("items/", CartViewSet.as_view({"post": "items"}), name="cart-add-item"),
    path("items/<int:item_id>/", CartViewSet.as_view({"patch": "update_item", "delete": "remove_item"}), name="cart-item-detail"),
    path("sync/", CartViewSet.as_view({"post": "sync"}), name="cart-sync"),
]
