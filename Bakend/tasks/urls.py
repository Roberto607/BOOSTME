from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, TaskCompletionViewSet

# Crear el router
router = DefaultRouter()

# Registrar los ViewSets con sus nombres base
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'completions', TaskCompletionViewSet, basename='taskcompletion')

# Incluir las URLs del router
urlpatterns = [
    path('', include(router.urls)),
]
