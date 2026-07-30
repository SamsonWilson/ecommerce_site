from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Pagination par défaut de l'API.

    Le client peut demander une taille de page (`?page_size=8` pour la grille
    d'accueil), plafonnée pour qu'une requête ne puisse pas tirer tout le
    catalogue d'un coup.
    """

    page_size_query_param = "page_size"
    max_page_size = 60
