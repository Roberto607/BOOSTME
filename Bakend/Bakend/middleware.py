# Bakend/middleware.py (en la misma carpeta que settings.py)
import logging
import traceback
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

class ErrorLoggingMiddleware(MiddlewareMixin):
    def process_exception(self, request, exception):
        logger.error(f"Error en {request.path}: {str(exception)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None
