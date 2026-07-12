from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BonusTypeViewSet, UserBonusViewSet, UserStreakViewSet

router = DefaultRouter()
router.register(r'bonus-types', BonusTypeViewSet)
router.register(r'user-bonuses', UserBonusViewSet)
router.register(r'user-streak', UserStreakViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
