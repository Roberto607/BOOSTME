from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Crear el router
router = DefaultRouter()

# Registrar los ViewSets
router.register(r'system', views.ReferralSystemViewSet, basename='referral_system')
router.register(r'earnings', views.ReferralEarningViewSet, basename='referral_earning')
router.register(r'withdrawals', views.ReferralWithdrawalViewSet, basename='referral_withdrawal')
router.register(r'register', views.ReferralRegistrationViewSet, basename='referral_registration')

# URLs de la API
urlpatterns = [
    path('', include(router.urls)),
]
