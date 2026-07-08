from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, DocumentCollaborationViewSet

router = DefaultRouter()
router.register("documents", DocumentViewSet, basename="documents")
router.register("collaborations", DocumentCollaborationViewSet, basename="collaborations")

urlpatterns = router.urls