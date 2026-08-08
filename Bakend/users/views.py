from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from django.conf import settings
from django.shortcuts import redirect
from django.core.mail import EmailMultiAlternatives, EmailMessage, send_mail
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from .tokens import account_activation_token
import logging
from rest_framework_simplejwt.views import TokenRefreshView
import re
from django.db import transaction
from rest_framework.throttling import UserRateThrottle
from django.utils.decorators import method_decorator
from threading import Thread
from django.views.decorators.csrf import csrf_exempt
from urllib.parse import urljoin, urlencode
from urllib import request as urllib_request, error as urllib_error
import json
import secrets
from datetime import timedelta

try:
    from web3 import Web3
    from eth_account.messages import encode_defunct
except ImportError:
    Web3 = None
    def encode_defunct(*args, **kwargs):
        raise ImportError('web3 is required for wallet signature verification')

from .tokens import password_reset_token
from .models import User, Transaction, UserPlan
from .serializers import UserSerializer, RegisterSerializer, ActivatePlanSerializer, WithdrawSerializer

logger = logging.getLogger(__name__)
User = get_user_model()


def _send_html_mail(subject, message, recipient_list, text_content=None, from_email=None):
    try:
        email_message = EmailMultiAlternatives(
            subject,
            text_content or 'Activa tu cuenta en BoostMe.',
            from_email or settings.DEFAULT_FROM_EMAIL,
            recipient_list,
        )
        email_message.attach_alternative(message, 'text/html')
        email_message.extra_headers['List-Unsubscribe'] = '<mailto:donotreply@boostme.app>'
        email_message.extra_headers['Auto-Submitted'] = 'auto-generated'
        email_message.extra_headers['Precedence'] = 'bulk'
        email_message.extra_headers['X-Auto-Response-Suppress'] = 'OOF, DR, RN, NRN'
        sent_count = email_message.send()
        logger.info("Email send attempt completed. Sent=%s recipients=%s", sent_count, recipient_list)
        return True, None
    except Exception as exc:
        logger.exception("Error sending email")
        return False, f"{type(exc).__name__}: {exc}"


def _sanitize_for_json(obj):
    """Recursively convert non-serializables to strings to avoid JSON encoder errors
    when constructing Response objects in edge cases (e.g., EmailMessage instances).
    """
    # Primitives are fine
    if obj is None or isinstance(obj, (str, bool, int, float)):
        return obj
    # Dict -> sanitize entries
    if isinstance(obj, dict):
        return {str(k): _sanitize_for_json(v) for k, v in obj.items()}
    # List/tuple -> sanitize elements
    if isinstance(obj, (list, tuple)):
        return [_sanitize_for_json(v) for v in obj]
    # Fallback: convert to string
    try:
        return str(obj)
    except Exception:
        return repr(obj)


def _generate_wallet_nonce(length: int = 32) -> str:
    return secrets.token_hex(length)


def _wallet_nonce_expired(user: User) -> bool:
    if not user.wallet_nonce_created_at:
        return True
    expiration = user.wallet_nonce_created_at + timedelta(minutes=15)
    return timezone.now() > expiration


def _verify_wallet_signature(wallet_address: str, nonce: str, signature: str) -> bool:
    if Web3 is None:
        raise ImportError('web3 is required for wallet signature verification')
    try:
        message = encode_defunct(text=f"BoostMe verification nonce: {nonce}")
        signer = Web3().eth.account.recover_message(message, signature=signature)
        return signer.lower() == wallet_address.lower()
    except Exception as exc:
        logger.exception('Error verifying wallet signature: %s', exc)
        return False

def _attach_jwt_cookies(resp, access_token, refresh_token, access_max_age, refresh_max_age):
    secure_access = settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', False)
    secure_refresh = settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SECURE', False)

    resp.set_cookie(
        'access', access_token,
        httponly=True,
        secure=secure_access,
        samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
        max_age=access_max_age,
        path='/'
    )
    resp.set_cookie(
        'refresh', refresh_token,
        httponly=True,
        secure=secure_refresh,
        samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SAMESITE', 'Lax'),
        max_age=refresh_max_age,
        path='/'
    )
    return resp


def _resolve_frontend_base_url(request):
    configured = (getattr(settings, 'FRONTEND_URL', '') or '').strip()
    if configured:
        return configured.rstrip('/')

    origin = (request.headers.get('Origin') or '').strip()
    if origin:
        return origin.rstrip('/')

    forwarded_proto = request.headers.get('X-Forwarded-Proto', request.scheme)
    forwarded_host = request.headers.get('X-Forwarded-Host', request.get_host())
    if forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}".rstrip('/')

    return 'http://localhost:5173'

@method_decorator(csrf_exempt, name='dispatch')
class ContactView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            name = (request.data.get('name') or '').strip()
            email = (request.data.get('email') or '').strip()
            message = (request.data.get('message') or '').strip()

            if not all([name, email, message]):
                return Response({"error": "Todos los campos son requeridos"}, status=status.HTTP_400_BAD_REQUEST)

            subject = f"Solicitud de contacto desde BoostMe - {name}"
            body = (
                f"Nombre: {name}\n"
                f"Correo: {email}\n\n"
                f"Mensaje:\n{message}"
            )

            sent, error = _send_html_mail(
                subject,
                f"<p><strong>Nombre:</strong> {name}<br/><strong>Correo:</strong> {email}</p><p>{message}</p>",
                [settings.EMAIL_HOST_USER],
                text_content=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
            )

            if not sent:
                logger.error("No se pudo enviar el mensaje de contacto: %s", error)
                return Response({"error": "No se pudo enviar el mensaje"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({"message": "Tu mensaje fue enviado correctamente"}, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Error en contacto")
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [UserRateThrottle]
    
    def post(self, request):
        try:
            logger.info(f"Intento de registro desde IP: {request.META.get('REMOTE_ADDR')}")
            
            # Validar que el content type sea application/json
            if request.content_type != 'application/json':
                return Response({
                    "error": "Content-Type debe ser application/json",
                    "code": "invalid_content_type"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Datos básicos
            email = request.data.get('email', '').strip().lower()
            username = request.data.get('username', '').strip()
            password = request.data.get('password', '')
            wallet_address = (request.data.get('wallet_address') or '').strip().lower()

            # Validaciones básicas
            if not all([email, username, password]):
                return Response({
                    "error": "Todos los campos son requeridos",
                    "code": "missing_fields"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validar formato de email
            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
                return Response({
                    "error": "Formato de email inválido",
                    "code": "invalid_email"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validar username
            if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
                return Response({
                    "error": "El nombre de usuario debe tener entre 3 y 20 caracteres y solo puede contener letras, números y guiones bajos",
                    "code": "invalid_username"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validar contraseña
            if len(password) < 8:
                return Response({
                    "error": "La contraseña debe tener al menos 8 caracteres",
                    "code": "password_too_short"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not re.search(r'[A-Z]', password):
                return Response({
                    "error": "La contraseña debe contener al menos una letra mayúscula",
                    "code": "password_missing_uppercase"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not re.search(r'[a-z]', password):
                return Response({
                    "error": "La contraseña debe contener al menos una letra minúscula",
                    "code": "password_missing_lowercase"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not re.search(r'[0-9]', password):
                return Response({
                    "error": "La contraseña debe contener al menos un número",
                    "code": "password_missing_number"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar si el email ya existe
            if User.objects.filter(email=email).exists():
                return Response({
                    "error": "Ya existe una cuenta con este email",
                    "code": "email_exists"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar si el username ya existe
            if User.objects.filter(username=username).exists():
                return Response({
                    "error": "El nombre de usuario ya está en uso",
                    "code": "username_exists"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validar wallet y exigirla para el registro
            if not wallet_address:
                return Response({
                    "error": "La dirección de wallet es requerida",
                    "code": "missing_wallet_address"
                }, status=status.HTTP_400_BAD_REQUEST)

            if not wallet_address.startswith('0x') or len(wallet_address) != 42:
                return Response({
                    "error": "La dirección de wallet debe comenzar con 0x y tener 42 caracteres",
                    "code": "invalid_wallet_address"
                }, status=status.HTTP_400_BAD_REQUEST)
            try:
                int(wallet_address[2:], 16)
            except ValueError:
                return Response({
                    "error": "La dirección de wallet debe ser hexadecimal",
                    "code": "invalid_wallet_address"
                }, status=status.HTTP_400_BAD_REQUEST)
            if User.objects.filter(wallet_address=wallet_address).exists():
                return Response({
                    "error": "Esta dirección de wallet ya está en uso",
                    "code": "wallet_address_exists"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Crear usuario
            user = None
            with transaction.atomic():
                try:
                    # Usar create_user para asegurar que se utilicen todos los métodos necesarios
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        password=password,
                        is_active=False,
                        is_email_verified=False,
                        has_financial_activation=False,
                        wallet_address=wallet_address
                    )

                    # Generar tokens JWT
                    refresh = RefreshToken.for_user(user)
                    access_token = str(refresh.access_token)
                    refresh_token = str(refresh)

                    user.wallet_nonce = _generate_wallet_nonce()
                    user.wallet_nonce_created_at = timezone.now()
                    user.save(update_fields=['wallet_nonce', 'wallet_nonce_created_at'])

                    # Nota: el flujo de verificación por email está temporalmente deshabilitado
                    # because email sending currently falla en producción sin un dominio propio.
                    # El registro ahora se completa solo con wallet.
                    # token = account_activation_token.make_token(user)
                    # uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
                    # frontend_url = _resolve_frontend_base_url(request)
                    # verification_link = urljoin(frontend_url, f"/verify-email/{uidb64}/{token}/")
                    # email_sent, email_error = _send_html_mail(...)

                    # Serializar el usuario completo
                    try:
                        user_data = UserSerializer(user, context={'request': request}).data
                    except Exception as serializer_error:
                        logger.warning("No se pudo serializar el usuario tras el registro: %s", serializer_error)
                        user_data = {
                            "id": user.id,
                            "username": user.username,
                            "email": user.email,
                            "is_email_verified": user.is_email_verified,
                            "has_financial_activation": user.has_financial_activation,
                            "is_active": user.is_active,
                        }
                    
                    # Devolver respuesta completa con usuario serializado
                    response_data = {
                        "message": "Registro exitoso. Firma el nonce para verificar tu wallet.",
                        "user": user_data,
                        "access": str(access_token),
                        "refresh": str(refresh),
                        "next_step": "verify_wallet",
                        "wallet_verification_nonce": user.wallet_nonce,
                        "wallet_address": wallet_address,
                    }

                    # Crear respuesta y configurar cookies
                    resp = Response(response_data, status=status.HTTP_201_CREATED)
                    
                    # Configurar cookies de JWT
                    access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
                    refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
                    
                    # Configurar cookies según el entorno
                    secure_setting = settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', not settings.DEBUG)
                    samesite_setting = settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax')
                    refresh_samesite_setting = settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SAMESITE', 'Lax')
                    refresh_secure_setting = settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SECURE', not settings.DEBUG)
                    
                    # Configurar cookie de acceso
                    resp.set_cookie(
                        'access', 
                        access_token, 
                        httponly=True, 
                        secure=secure_setting,
                        samesite=samesite_setting,
                        max_age=access_max_age,
                        path='/'
                    )
                    
                    # Configurar cookie de refresh
                    resp.set_cookie(
                        'refresh', 
                        refresh_token, 
                        httponly=True, 
                        secure=refresh_secure_setting,
                        samesite=refresh_samesite_setting,
                        max_age=refresh_max_age,
                        path='/'
                    )
                    
                    return resp
                    
                except Exception as user_error:
                    logger.error(f"Error al crear el usuario: {user_error}", exc_info=True)
                    raise Exception(f"Error al crear la cuenta: {str(user_error)}")
                    
        except Exception as e:
            logger.error(f"Error en el registro: {str(e)}", exc_info=True)
            if user is not None:
                return Response({
                    "message": "Registro creado, pero el proceso finalizó con una advertencia. Revisa tu correo o intenta más tarde.",
                    "warning": "registration_completed_with_warning",
                    "detail": str(e) if settings.DEBUG else None
                }, status=status.HTTP_201_CREATED)

            return Response({
                "error": "Error interno del servidor",
                "detail": str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            username = (request.data.get('username') or '').strip()
            password = request.data.get('password') or ''

            if not username or not password:
                return Response({
                    'error': 'Usuario y contraseña son requeridos',
                    'code': 'missing_credentials'
                }, status=status.HTTP_400_BAD_REQUEST)

            user = authenticate(username=username, password=password)
            if not user:
                return Response({
                    'error': 'Credenciales inválidas',
                    'code': 'invalid_credentials'
                }, status=status.HTTP_401_UNAUTHORIZED)

            if not user.is_verified:
                return Response({
                    'error': 'Debes verificar tu cuenta antes de iniciar sesión',
                    'code': 'account_not_verified'
                }, status=status.HTTP_403_FORBIDDEN)

            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            user_data = UserSerializer(user, context={'request': request}).data
            response_payload = {
                'access': access_token,
                'refresh': refresh_token,
                'token_type': 'Bearer',
                'expires_in': int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
                'user': user_data,
            }

            resp = Response(response_payload, status=status.HTTP_200_OK)
            access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
            refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())

            resp.set_cookie(
                'access', access_token,
                httponly=True,
                secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', not settings.DEBUG),
                samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
                max_age=access_max_age,
                path='/'
            )
            resp.set_cookie(
                'refresh', refresh_token,
                httponly=True,
                secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SECURE', not settings.DEBUG),
                samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SAMESITE', 'Lax'),
                max_age=refresh_max_age,
                path='/'
            )

            return resp
        except Exception as exc:
            logger.error('Error en LoginView: %s', exc, exc_info=True)
            return Response({
                'error': 'Error al iniciar sesión',
                'code': 'login_error',
                'detail': str(exc) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class VerifyWalletSignatureView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        wallet_address = (request.data.get('wallet_address') or '').strip().lower()
        nonce = request.data.get('nonce', '').strip()
        signature = request.data.get('signature', '').strip()

        if not wallet_address or not nonce or not signature:
            return Response({
                'error': 'wallet_address, nonce y signature son requeridos',
                'code': 'missing_fields'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(wallet_address=wallet_address)
        except User.DoesNotExist:
            return Response({
                'error': 'Usuario con esa wallet no encontrado',
                'code': 'user_not_found'
            }, status=status.HTTP_404_NOT_FOUND)

        if user.is_wallet_verified:
            return Response({
                'message': 'Wallet ya está verificada',
                'user': UserSerializer(user, context={'request': request}).data
            }, status=status.HTTP_200_OK)

        if user.wallet_nonce != nonce:
            return Response({
                'error': 'Nonce inválido',
                'code': 'invalid_nonce'
            }, status=status.HTTP_400_BAD_REQUEST)

        if _wallet_nonce_expired(user):
            return Response({
                'error': 'Nonce expirado',
                'code': 'nonce_expired'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not _verify_wallet_signature(wallet_address, nonce, signature):
            return Response({
                'error': 'Firma inválida',
                'code': 'invalid_signature'
            }, status=status.HTTP_400_BAD_REQUEST)

        user.is_wallet_verified = True
        user.is_active = True
        user.wallet_nonce = ''
        user.save(update_fields=['is_wallet_verified', 'is_active', 'wallet_nonce'])

        return Response({
            'message': 'Wallet verificada exitosamente',
            'user': UserSerializer(user, context={'request': request}).data
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh_token")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({"message": "Sesión cerrada exitosamente"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": "Error al cerrar sesión"}, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenRefreshView(TokenRefreshView):
    """
    Vista personalizada para renovar tokens de acceso
    """
    def post(self, request, *args, **kwargs):
        try:
            # Obtener el refresh token del request o de la cookie
            refresh_token = request.data.get('refresh') or request.COOKIES.get('refresh')
            
            if not refresh_token:
                return Response({
                    'error': 'Refresh token es requerido',
                    'code': 'missing_refresh_token'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Intentar crear un nuevo token
            refresh = RefreshToken(refresh_token)
            
            # Verificar si el refresh token está en la blacklist
            if hasattr(refresh, 'check_blacklist'):
                if refresh.check_blacklist():
                    return Response({
                        'error': 'Refresh token inválido o expirado',
                        'code': 'token_blacklisted'
                    }, status=status.HTTP_401_UNAUTHORIZED)

            # Obtener el usuario del token
            user = refresh.user
            
            # Verificar el estado del usuario
            if not user.is_verified:
                return Response({
                    'error': 'Cuenta no verificada',
                    'code': 'account_not_verified'
                }, status=status.HTTP_401_UNAUTHORIZED)

            # Generar nuevo access token
            access_token = str(refresh.access_token)
            
            # Si ROTATE_REFRESH_TOKENS=True, generar nuevo refresh token
            refresh_token_new = str(refresh)
            
            # Serializar el usuario
            user_data = UserSerializer(user, context={'request': request}).data
            
            response_data = {
                'access': access_token,
                'refresh': refresh_token_new,
                'token_type': 'Bearer',
                'expires_in': int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
                'user': user_data
            }

            resp = Response(response_data, status=status.HTTP_200_OK)

            # Actualizar cookies
            access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
            refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())

            resp.set_cookie(
                'access', access_token,
                httponly=True,
                secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', not settings.DEBUG),
                samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
                max_age=access_max_age,
                path='/'
            )
            resp.set_cookie(
                'refresh', refresh_token_new,
                httponly=True,
                secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SECURE', not settings.DEBUG),
                samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SAMESITE', 'Lax'),
                max_age=refresh_max_age,
                path='/'
            )

            return resp

        except Exception as e:
            return Response({
                'error': 'Error al renovar el token',
                'code': 'token_refresh_error',
                'detail': str(e) if settings.DEBUG else None
            }, status=status.HTTP_401_UNAUTHORIZED)

@method_decorator(csrf_exempt, name='dispatch')
class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, uidb64, token):
        try:
            uidb64 = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uidb64)

            if password_reset_token.check_token(user, token):
                return Response({
                    "message": "Token válido",
                    "uid": uidb64,
                    "token": token
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "error": "Token inválido o expirado"
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                "error": "Error al verificar token"
            }, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)

            if password_reset_token.check_token(user, token):
                password = request.data.get('password')
                password2 = request.data.get('password2')

                if password != password2:
                    return Response({
                        "error": "Las contraseñas no coinciden"
                    }, status=status.HTTP_400_BAD_REQUEST)

                user.set_password(password)
                user.save()

                return Response({
                    "message": "Contraseña actualizada exitosamente"
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "error": "Token inválido o expirado"
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                "error": "Error al actualizar contraseña"
            }, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            email = request.data.get('email', '').strip().lower()
            if not email:
                return Response({
                    'error': 'Email es requerido',
                    'code': 'missing_email'
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                user = User.objects.get(email=email)

                # Generar token de recuperación
                token = password_reset_token.make_token(user)
                uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
                
                # Construir URL de reset
                reset_url = f"{settings.FRONTEND_URL}/reset-password/{uidb64}/{token}/"
                
                # Preparar email
                mail_subject = 'Recupera tu contraseña'
                message = render_to_string('users/reset_password_email.html', {
                    'user': user,
                    'reset_url': reset_url,
                })
                
                def _send_reset():
                    try:
                        send_mail(
                            mail_subject,
                            '',
                            settings.DEFAULT_FROM_EMAIL,
                            [email],
                            fail_silently=False,
                            html_message=message,
                        )
                    except Exception:
                        logger.exception("Error sending password reset email")

                Thread(target=_send_reset).start()

                logger.info(f"Email de recuperación enviado a {email}")

                return Response({
                    'message': 'Si el email existe en nuestro sistema, recibirás instrucciones para recuperar tu contraseña'
                }, status=status.HTTP_200_OK)

            except User.DoesNotExist:
                # Evitar filtrar si existe o no
                return Response({
                    'message': 'Si el email existe en nuestro sistema, recibirás instrucciones para recuperar tu contraseña'
                }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error en ForgotPasswordView: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error interno del servidor',
                'code': 'server_error',
                'detail': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DepositView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Verificar que la cuenta esté verificada
            if not request.user.is_verified:
                return Response({
                    "error": "Debes verificar tu cuenta antes de realizar un depósito",
                    "code": "account_not_verified"
                }, status=status.HTTP_403_FORBIDDEN)

            amount_usdt = float(request.data.get('amount', 0))
            if amount_usdt <= 0:
                return Response({
                    "error": "Monto inválido",
                    "code": "invalid_amount"
                }, status=status.HTTP_400_BAD_REQUEST)

            user = request.user
            boost_equiv = amount_usdt * 100  # 1 USDT = 100 BOOST

            with transaction.atomic():
                # Actualizar cuenta y balance
                user.is_active = True
                user.has_financial_activation = True
                user.boost_balance += boost_equiv
                user.purchased_boost += boost_equiv
                user.save()

                # Registrar la transacción
                Transaction.objects.create(
                    user=user,
                    transaction_type='deposit',
                    usdt_amount=amount_usdt,
                    boost_amount=boost_equiv,
                    status='completed'
                )

                # Serializar el usuario actualizado
                user_data = UserSerializer(user, context={'request': request}).data

            return Response({
                "message": "Depósito confirmado. Tu cuenta ya está activa.",
                "user": user_data,
                "boost_added": boost_equiv
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error en el depósito: {str(e)}", exc_info=True)
            return Response({
                "error": "Error procesando el depósito",
                "code": "deposit_error",
                "detail": str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class UserStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user = request.user
            
            # Serializar el usuario
            user_data = UserSerializer(user, context={'request': request}).data
            
            return Response({
                "user": user_data,
                "status": {
                    "is_email_verified": user.is_email_verified,
                    "is_wallet_verified": user.is_wallet_verified,
                    "is_verified": user.is_verified,
                    "has_financial_activation": user.has_financial_activation,
                    "is_active": user.is_active,
                    "can_withdraw": user.can_withdraw,
                    "next_step": self.get_next_step(user)
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error en UserStatusView: {str(e)}", exc_info=True)
            return Response({
                "error": "Error al obtener el estado del usuario",
                "code": "status_error",
                "detail": str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_next_step(self, user):
        """Determina el siguiente paso que debe seguir el usuario"""
        if not user.is_verified:
            return "verify_account"
        if not user.has_financial_activation:
            return "make_deposit"
        return "complete"

@method_decorator(csrf_exempt, name='dispatch')
class ActivatePlanView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            user = request.user
            # Aceptar tanto 'plan' (frontend) como 'plan_name' (posible clientes)
            plan_name = request.data.get('plan') or request.data.get('plan_name') or 'Free'
            
            # Obtener o crear el UserPlan
            user_plan, created = UserPlan.objects.get_or_create(
                user=user,
                defaults={
                    'plan_name': plan_name,
                    'is_active': True
                }
            )
            
            if not created:
                # Si ya existe, actualizarlo
                user_plan.plan_name = plan_name
                user_plan.is_active = True
                user_plan.save()
            
            # Activar el plan (esto generará las tareas automáticamente)
            try:
                user_plan.activate_plan()
            except Exception as exc:
                logger.error("Excepción al ejecutar user_plan.activate_plan()", exc_info=True)
                # Re-raise so outer try/except logs and returns a 500 as well,
                # but we've logged the precise location already.
                raise

            # Marcar la activación financiera del usuario
            if not user.has_financial_activation:
                user.has_financial_activation = True
                user.is_active = True
                user.save()

            # Generar tokens y setear cookies para que el navegador los almacene de forma segura
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            # Serializar la respuesta
            user_data = UserSerializer(user, context={'request': request}).data

            resp_payload = {
                'message': f'Plan {plan_name} activado exitosamente',
                'user': user_data,
                'plan': {
                    'name': user_plan.plan_name,
                    'daily_tasks': user_plan.daily_tasks,
                    'bonus_percentage': user_plan.bonus_percentage,
                    'weekly_withdrawal_limit': user_plan.weekly_withdrawal_limit
                }
            }

            # Sanitizar antes de crear la Response
            resp = Response(_sanitize_for_json(resp_payload), status=status.HTTP_200_OK)

            access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
            refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())

            resp.set_cookie(
                'access', access_token,
                httponly=True,
                secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', not settings.DEBUG),
                samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
                max_age=access_max_age,
                path='/'
            )
            resp.set_cookie(
                'refresh', refresh_token,
                httponly=True,
                secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SECURE', not settings.DEBUG),
                samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SAMESITE', 'Lax'),
                max_age=refresh_max_age,
                path='/'
            )

            return resp
            
        except Exception as e:
            logger.error(f"Error al activar plan: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al activar el plan',
                'code': 'activation_error',
                'detail': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class WithdrawView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            serializer = WithdrawSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            boost_amount = serializer.validated_data['boost_amount']
            wallet_address = serializer.validated_data['wallet_address']

            user = request.user
            if not user.can_withdraw:
                return Response({
                    'error': 'No tienes saldo disponible para retirar o alcanzaste el límite semanal',
                    'code': 'cannot_withdraw'
                }, status=status.HTTP_400_BAD_REQUEST)

            if boost_amount > user.earned_boost:
                return Response({
                    'error': 'Solo puedes retirar BOOST ganados por tareas',
                    'code': 'insufficient_earned_boost'
                }, status=status.HTTP_400_BAD_REQUEST)

            if user.current_week_withdrawn + boost_amount > user.weekly_limit:
                return Response({
                    'error': 'Límite semanal de retiro superado',
                    'code': 'weekly_limit_exceeded'
                }, status=status.HTTP_400_BAD_REQUEST)

            if boost_amount > user.boost_balance:
                return Response({
                    'error': 'Saldo BOOST insuficiente',
                    'code': 'insufficient_balance'
                }, status=status.HTTP_400_BAD_REQUEST)

            transaction = Transaction.objects.create(
                user=user,
                transaction_type='withdrawal',
                boost_amount=boost_amount,
                user_wallet_address=wallet_address,
                status='pending',
                description='Solicitud de retiro BOOST a USDT'
            )

            if not transaction.complete_withdrawal():
                return Response({
                    'error': transaction.description or 'No se pudo procesar el retiro',
                    'code': 'withdrawal_failed'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Enviar notificación por email al usuario informando tiempos de espera
            def _send_withdraw_email():
                try:
                    subject = 'Confirmación de retiro en BoostMe'
                    # Texto plano como fallback
                    plain_message = (
                        f"Hola {user.username},\n\n"
                        f"Tu solicitud de retiro de {boost_amount} BOOST ha sido procesada. "
                        f"El monto convertido corresponde a {transaction.usdt_amount} USDT y será acreditado en tu wallet. "
                        f"Hash de transacción: {transaction.tx_hash}\n"
                        "Por favor espera hasta 2-5 minutos para la confirmación de tu retiro en Polygon.\n\n"
                        "Gracias por usar BoostMe.\n"
                    )

                    html_message = render_to_string('users/withdrawal_email.html', {
                        'user': user,
                        'boost_amount': boost_amount,
                        'usdt_amount': transaction.usdt_amount,
                        'tx_hash': transaction.tx_hash,
                        'wait_minutes': 5,
                        'domain': settings.FRONTEND_URL,
                        'protocol': 'https' if not settings.DEBUG else 'http',
                        'now': timezone.now(),
                    })

                    send_mail(
                        subject,
                        plain_message,
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=False,
                        html_message=html_message,
                    )
                except Exception:
                    logger.exception('Error enviando email de confirmación de retiro')

            Thread(target=_send_withdraw_email).start()

            return Response({
                'message': 'Retiro procesado correctamente',
                'withdrawn_boost': float(boost_amount),
                'received_usdt': float(transaction.usdt_amount),
                'tx_hash': transaction.tx_hash,
                'wallet_balance_usdt': float(user.balance),
                'current_week_withdrawn': float(user.current_week_withdrawn)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error en WithdrawView: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error procesando el retiro',
                'code': 'withdrawal_error',
                'detail': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class EmailVerificationView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, uidb64, token):
        try:
            # Decodificar el uidb64
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)

            # Verificar el token
            if account_activation_token.check_token(user, token):
                # Activar el usuario
                user.is_active = True
                user.is_email_verified = True
                user.save()

                # Generar tokens JWT
                refresh = RefreshToken.for_user(user)
                access_token = refresh.access_token

                # Serializar el usuario
                user_data = UserSerializer(user, context={'request': request}).data

                response_data = {
                    "message": "Email verificado exitosamente",
                    "user": user_data,
                    "access": str(access_token),
                    "refresh": str(refresh)
                }

                # Configurar cookies
                resp = Response(response_data, status=status.HTTP_200_OK)
                access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
                refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())

                resp.set_cookie(
                    'access', access_token,
                    httponly=True,
                    secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', not settings.DEBUG),
                    samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
                    max_age=access_max_age,
                    path='/'
                )
                resp.set_cookie(
                    'refresh', refresh,
                    httponly=True,
                    secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SECURE', not settings.DEBUG),
                    samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SAMESITE', 'Lax'),
                    max_age=refresh_max_age,
                    path='/'
                )

                return resp
            else:
                return Response({
                    "error": "Token de verificación inválido o expirado"
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error en EmailVerificationView: {str(e)}", exc_info=True)
            return Response({
                "error": "Error al verificar el email"
            }, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            email = request.data.get('email', '').strip().lower()
            if not email:
                return Response({
                    'error': 'Email es requerido',
                    'code': 'missing_email'
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                user = User.objects.get(email=email)

                # Solo permitir reenviar si el usuario no ha verificado su email
                if user.is_email_verified:
                    return Response({
                        'error': 'El email ya ha sido verificado',
                        'code': 'email_already_verified'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Generar token de verificación
                token = account_activation_token.make_token(user)
                uidb64 = urlsafe_base64_encode(force_bytes(user.pk))

                # Crear link de verificación
                frontend_url = settings.FRONTEND_URL.rstrip('/')
                verification_link = urljoin(
                    frontend_url,
                    f"/verify-email/{uidb64}/{token}/"
                )

                # Construir mensaje de email
                mail_subject = 'Activa tu cuenta en BoostMe'

                # Verificar si existe el template de email
                try:
                    message = render_to_string('users/acc_active_email.html', {
                        'user': user,
                        'verification_link': verification_link,
                        'uidb64': uidb64,
                        'token': token,
                        'domain': frontend_url,
                        'protocol': 'https' if not settings.DEBUG else 'http',
                    })
                except Exception as template_error:
                    logger.error(f"Error al renderizar el template de email: {template_error}")
                    # Crear un mensaje simple si el template falla
                    message = f"""
                    <h2>Bienvenido a BoostMe, {user.username}!</h2>
                    <p>Gracias por registrarte. Para activar tu cuenta, por favor haz clic en el siguiente enlace:</p>
                    <p><a href="{verification_link}">Verificar mi cuenta</a></p>
                    <p>Si no puedes hacer clic en el enlace, copia y pega la siguiente URL en tu navegador:</p>
                    <p>{verification_link}</p>
                    <p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
                    """

                plain_text = (
                    f"Hola {user.username},\n\n"
                    f"Gracias por registrarte en BoostMe. Confirma tu correo aquí: {verification_link}\n\n"
                    "Si no creaste esta cuenta, puedes ignorar este mensaje."
                )

                # Intentar enviar el email
                email_sent, email_error = _send_html_mail(mail_subject, message, [email], text_content=plain_text)

                if email_sent:
                    logger.info(f"Email de verificación reenviado a {email}")
                    return Response({
                        'message': 'Email de verificación reenviado correctamente. Revisa tu correo.',
                        'email': email
                    }, status=status.HTTP_200_OK)
                else:
                    logger.error(f"No se pudo reenviar el email de verificación a {email}: {email_error}")
                    return Response({
                        'error': 'No se pudo enviar el email de verificación',
                        'code': 'email_not_sent',
                        'detail': email_error or 'No se pudo enviar el email'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            except User.DoesNotExist:
                return Response({
                    'error': 'No existe una cuenta con este email',
                    'code': 'user_not_found'
                }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Error en ResendVerificationView: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error interno del servidor',
                'code': 'server_error',
                'detail': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Obtener el perfil del usuario."""
        try:
            serializer = UserSerializer(request.user, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            return Response({
                'error': 'Error al obtener el perfil',
                'detail': str(e) if settings.DEBUG else None
            }, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        """Actualizar el perfil del usuario."""
        try:
            user = request.user
            serializer = UserSerializer(user, data=request.data, partial=True, context={'request': request})
            
            if serializer.is_valid():
                serializer.save()

                profile_task = user.tasks.filter(
                    task_type='profile',
                    status='pending'
                ).order_by('-created_at').first()

                if profile_task:
                    profile_task.complete_task()

                return Response({
                    'message': 'Perfil actualizado exitosamente',
                    'user': serializer.data,
                    'boost_awarded': float(profile_task.boost_reward) if profile_task else 0
                })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'error': 'Error al actualizar el perfil',
                'detail': str(e) if settings.DEBUG else None
            }, status=status.HTTP_400_BAD_REQUEST)
