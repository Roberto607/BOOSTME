from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import PlanDefinitionViewSet

router = DefaultRouter()
router.register(r'plans', PlanDefinitionViewSet, basename='plan-definition')

urlpatterns = [
    path('', include(router.urls)),
]
