from django.urls import path

from .views import ShippingCountriesView, ShippingOptionsView

urlpatterns = [
    path("countries/", ShippingCountriesView.as_view(), name="shipping-countries"),
    path("options/", ShippingOptionsView.as_view(), name="shipping-options"),
]
