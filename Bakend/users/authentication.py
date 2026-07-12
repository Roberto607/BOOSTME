from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


class CookieJWTAuthentication(JWTAuthentication):
    """Extiende JWTAuthentication para aceptar el token desde cookie.

    Si la cabecera Authorization no está presente, intenta leer la cookie
    configurada en SIMPLE_JWT['AUTH_COOKIE'] y construir un header
    "Bearer <token>".
    
    Si el cookie existe pero es inválido, retorna None (no fuerza autenticación).
    """
    def get_header(self, request):
        header = super().get_header(request)
        if header is None:
            cookie_name = settings.SIMPLE_JWT.get('AUTH_COOKIE', 'access')
            access = request.COOKIES.get(cookie_name)
            if access:
                return f"Bearer {access}".encode()
        return header
    
    def authenticate(self, request):
        """Intenta autenticación con JWT desde Authorization header o cookie.
        
        Si ambos están ausentes o son inválidos, retorna None (permitiendo 
        que continúe sin autenticación para endpoints que no la requieren).
        """
        header = self.get_header(request)
        
        if header is None:
            return None
        
        try:
            return super().authenticate(request)
        except AuthenticationFailed:
            # Si hay un header pero es inválido, retornamos None
            # para permitir que las permission_classes manjen el acceso
            return None
