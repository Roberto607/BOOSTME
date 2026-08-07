from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from django.views.generic import RedirectView
from .views import home, custom_not_found

urlpatterns = [
    path('', home, name='home'),
    path('admin', RedirectView.as_view(url='/admin/', permanent=False), name='admin-root'),
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/referrals/', include('referrals.urls')),
    path('api/bonuses/', include('bonuses.urls')),
    path('api/plans/', include('plan.urls')),
]

# Manejo de errores para producción
handler404 = custom_not_found
handler500 = custom_not_found

# En producción, no servir archivos estáticos con Django
if not settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
