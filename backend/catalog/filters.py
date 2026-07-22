import django_filters as filters
from django.db.models import Min

from .models import Product


class ProductFilter(filters.FilterSet):
    """Filtres du catalogue : catégorie, moment, couleur, collection, prix."""

    category = filters.CharFilter(field_name="category__slug")
    moment = filters.CharFilter(field_name="wedding_moments__slug")
    color = filters.CharFilter(field_name="colors__slug")
    collection = filters.CharFilter(field_name="collection__slug")
    min_price = filters.NumberFilter(method="filter_min_price")
    max_price = filters.NumberFilter(method="filter_max_price")

    class Meta:
        model = Product
        fields = ["category", "moment", "color", "collection"]

    # Prix filtré sur le prix de détail de la variante la moins chère.
    def filter_min_price(self, queryset, name, value):
        return queryset.annotate(_p=Min("variants__retail_price")).filter(_p__gte=value)

    def filter_max_price(self, queryset, name, value):
        return queryset.annotate(_p=Min("variants__retail_price")).filter(_p__lte=value)
