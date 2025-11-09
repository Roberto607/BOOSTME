# utils.py
from django.core import signing
from django.conf import settings
import random
from django.core.cache import cache

def generate_verification_token(email):
    """
    Genera un token firmado usando el sistema de signing de Django
    """
    return signing.dumps({'email': email}, salt=settings.SECRET_KEY)

def verify_verification_token(token):
    """
    Verifica el token firmado y retorna el email si es válido
    """
    try:
        data = signing.loads(token, salt=settings.SECRET_KEY, max_age=60*60*24)  # 24h
        return data['email']
    except signing.BadSignature:
        return None
    except signing.SignatureExpired:
        return None

def generate_verification_code(email):
    """
    Genera un código numérico de 6 dígitos
    """
    code = f"{random.randint(100000, 999999)}"
    # Guardar en caché por 15 minutos
    cache.set(f"verification_code_{email}", code, 900)
    return code

def verify_email_code(email, code):
    """
    Verifica el código de 6 dígitos
    """
    stored_code = cache.get(f"verification_code_{email}")
    if stored_code and code == stored_code:
        cache.delete(f"verification_code_{email}")
        return True
    return False

