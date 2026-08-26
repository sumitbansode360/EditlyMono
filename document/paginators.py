from rest_framework.pagination import PageNumberPagination


class DocumentPagination(PageNumberPagination):
    """
    Custom pagination for documents with configurable page sizes.
    Default: 18 documents per page (3 rows × 6 columns on desktop)
    """
    page_size = 18
    page_size_query_param = 'page_size'
    max_page_size = 48
    page_query_param = 'page'
