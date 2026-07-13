from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from django.conf import settings
from django.shortcuts import redirect
from django.core.mail import send_mail, EmailMessage
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
from .tokens import password_reset_token
from .models import User, Transaction, UserPlan
from .serializers import UserSerializer, RegisterSerializer, ActivatePlanSerializer, WithdrawSerializer

logger = logging.getLogger(__name__)
User = get_user_model()


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

@method_decorator(csrf_exempt, name='dispatch')
class SurveyMonkeyAuthorizeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not settings.SURVEYMONKEY_CLIENT_ID or not settings.SURVEYMONKEY_OAUTH_REDIRECT_URI:
            return Response({
                'error': 'SurveyMonkey configuration missing',
                'message': 'Set SURVEYMONKEY_CLIENT_ID and SURVEYMONKEY_OAUTH_REDIRECT_URI in environment.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        params = {
            'response_type': 'code',
            'client_id': settings.SURVEYMONKEY_CLIENT_ID,
            'redirect_uri': settings.SURVEYMONKEY_OAUTH_REDIRECT_URI,
            'scope': settings.SURVEYMONKEY_SCOPES,
            'state': str(request.user.pk)
        }
        auth_url = f"{settings.SURVEYMONKEY_OAUTH_BASE_URL}?{urlencode(params)}"
        return Response({'authorization_url': auth_url}, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class SurveyMonkeyCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.GET.get('code')
        state = request.GET.get('state')
        if not code:
            redirect_path = f"{settings.FRONTEND_URL}/surveymonkey/connected?status=error&message=missing_code"
            return redirect(redirect_path)

        if not settings.SURVEYMONKEY_CLIENT_ID or not settings.SURVEYMONKEY_CLIENT_SECRET:
            redirect_path = f"{settings.FRONTEND_URL}/surveymonkey/connected?status=error&message=missing_credentials"
            return redirect(redirect_path)

        user = request.user if request.user.is_authenticated else None
        if user is None and state:
            try:
                user = User.objects.get(pk=state)
            except User.DoesNotExist:
                user = None

        if user is None:
            redirect_path = f"{settings.FRONTEND_URL}/surveymonkey/connected?status=error&message=user_not_found"
            return redirect(redirect_path)

        token_url = f"{settings.SURVEYMONKEY_API_BASE_URL}/oauth/token"
        payload = {
            'client_id': settings.SURVEYMONKEY_CLIENT_ID,
            'client_secret': settings.SURVEYMONKEY_CLIENT_SECRET,
            'code': code,
            'redirect_uri': settings.SURVEYMONKEY_OAUTH_REDIRECT_URI,
            'grant_type': 'authorization_code'
        }

        try:
            request_data = urlencode(payload).encode('utf-8')
            req = urllib_request.Request(
                token_url,
                data=request_data,
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            )
            with urllib_request.urlopen(req, timeout=15) as response:
                token_response = json.loads(response.read().decode('utf-8'))
        except urllib_error.HTTPError as exc:
            error_body = exc.read().decode('utf-8', errors='ignore')
            try:
                error_json = json.loads(error_body)
            except Exception:
                error_json = {'detail': error_body}
            return Response({
                'error': 'SurveyMonkey token exchange failed',
                'details': error_json,
                'status_code': exc.code
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            redirect_path = f"{settings.FRONTEND_URL}/surveymonkey/connected?status=error&message=token_exchange_failed"
            return redirect(redirect_path)

        access_token = token_response.get('access_token')
        if not access_token:
            return Response({
                'error': 'SurveyMonkey token response missing access_token',
                'details': token_response
            }, status=status.HTTP_400_BAD_REQUEST)

        validate_url = f"{settings.SURVEYMONKEY_API_BASE_URL}/v3/users/me"
        try:
            validate_req = urllib_request.Request(
                validate_url,
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Accept': 'application/json'
                }
            )
            with urllib_request.urlopen(validate_req, timeout=15) as response:
                survey_user = json.loads(response.read().decode('utf-8'))
        except urllib_error.HTTPError as exc:
            error_body = exc.read().decode('utf-8', errors='ignore')
            try:
                error_json = json.loads(error_body)
            except Exception:
                error_json = {'detail': error_body}
            return Response({
                'error': 'SurveyMonkey token validation failed',
                'details': error_json,
                'status_code': exc.code
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            redirect_path = f"{settings.FRONTEND_URL}/surveymonkey/connected?status=error&message=token_validation_failed"
            return redirect(redirect_path)

        user.surveymonkey_access_token = access_token
        user.surveymonkey_refresh_token = token_response.get('refresh_token')
        user.surveymonkey_scope = token_response.get('scope')
        user.surveymonkey_user_id = survey_user.get('id') or survey_user.get('account_id')
        expires_in = token_response.get('expires_in')
        if expires_in is not None:
            try:
                user.surveymonkey_token_expires_at = timezone.now() + timezone.timedelta(seconds=int(expires_in))
            except Exception:
                user.surveymonkey_token_expires_at = None
        user.save(update_fields=[
            'surveymonkey_access_token',
            'surveymonkey_refresh_token',
            'surveymonkey_scope',
            'surveymonkey_user_id',
            'surveymonkey_token_expires_at'
        ])

        redirect_path = f"{settings.FRONTEND_URL}/surveymonkey/connected?status=success"
        return redirect(redirect_path)

@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [UserRateThrottle]

    def post(self, request):
        try:
            logger.info(f"Intento de registro desde IP: {request.META.get('REMOTE_ADDR')}")

            # Datos básicos
            email = request.data.get('email', '').strip().lower()
            username = request.data.get('username', '').strip()
            password = request.data.get('password', '')

            # Validaciones básicas
            if not all([email, username, password]):
                return Response({
                    "error": "Todos los campos son requeridos",
                    "code": "missing_fields"
                }, status=status.HTTP_400_BAD_REQUEST)

            if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
                return Response({
                    "error": "Formato de email inválido",
                    "code": "invalid_email"
                }, status=status.HTTP_400_BAD_REQUEST)

            if len(password) < 8:
                return Response({
                    "error": "La contraseña debe tener al menos 8 caracteres",
                    "code": "password_too_short"
                }, status=status.HTTP_400_BAD_REQUEST)

            if User.objects.filter(email=email).exists():
                return Response({
                    "error": "Ya existe una cuenta con este email",
                    "code": "email_exists"
                }, status=status.HTTP_400_BAD_REQUEST)

            if User.objects.filter(username=username).exists():
                return Response({
                    "error": "El nombre de usuario ya está en uso",
                    "code": "username_exists"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Crear usuario
            with transaction.atomic():
                # Usar create directo y set_password para evitar recursión con create_user
                user = User.objects.create(
                    username=username,
                    email=email,
                    is_active=False,
                    is_email_verified=False,
                    has_financial_activation=False
                )
                user.set_password(password)
                user.save()

                # Generar tokens JWT
                refresh = RefreshToken.for_user(user)
                
                # Generar token de verificación
                token = account_activation_token.make_token(user)
                uidb64 = urlsafe_base64_encode(force_bytes(user.pk))

                # Crear link de verificación
                verification_link = urljoin(
                    settings.FRONTEND_URL,
                    f"/verify-email/{uidb64}/{token}/"
                )

                # Construir mensaje de email
                mail_subject = 'Activa tu cuenta en BoostMe'
                message = render_to_string('users/acc_active_email.html', {
                    'user': user,
                    'verification_link': verification_link,
                    'domain': settings.FRONTEND_URL,
                    'protocol': 'https' if not settings.DEBUG else 'http',
                })

                def _send_verification():
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
                        logger.exception("Error sending verification email")

                Thread(target=_send_verification).start()

                logger.info(f"Email de verificación enviado a {email}")

                # Serializar el usuario completo
                user_data = UserSerializer(user, context={'request': request}).data

                # Devolver respuesta completa con usuario serializado
                response_data = {
                    "message": "Registro exitoso. Revisa tu email para verificar tu cuenta.",
                    "user": user_data,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "next_step": "verify_email"
                }

                resp = Response(response_data, status=status.HTTP_201_CREATED)
                # Setear cookies para sesión segura
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)
                access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
                refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())

                resp.set_cookie('access', access_token, httponly=True, secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', not settings.DEBUG), samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'), max_age=access_max_age, path='/')
                resp.set_cookie('refresh', refresh_token, httponly=True, secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SECURE', not settings.DEBUG), samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SAMESITE', 'Lax'), max_age=refresh_max_age, path='/')

                return resp

        except Exception as e:
            logger.error(f"Error en el registro: {str(e)}", exc_info=True)
            return Response({
                "error": "Error interno del servidor",
                "detail": str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class EmailVerificationView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)

            if user.is_email_verified:
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)
                access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
                refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())

                resp = Response({
                    "message": "Correo ya verificado. Puedes proceder con tu depósito.",
                    "user": UserSerializer(user, context={'request': request}).data,
                    "next_step": "deposit"
                }, status=200)

                resp.set_cookie('access', access_token,
                                httponly=True,
                                secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', not settings.DEBUG),
                                samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
                                max_age=access_max_age,
                                path='/')
                resp.set_cookie('refresh', refresh_token,
                                httponly=True,
                                secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SECURE', not settings.DEBUG),
                                samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SAMESITE', 'Lax'),
                                max_age=refresh_max_age,
                                path='/')

                return resp

            if account_activation_token.check_token(user, token):
                user.is_email_verified = True
                user.is_active = True
                user.save(update_fields=['is_email_verified', 'is_active'])

                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)
                access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
                refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())

                resp = Response({
                    "message": "Correo verificado correctamente. Ahora puedes realizar tu depósito.",
                    "user": UserSerializer(user, context={'request': request}).data,
                    "next_step": "deposit"
                }, status=200)

                resp.set_cookie('access', access_token,
                                httponly=True,
                                secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', not settings.DEBUG),
                                samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
                                max_age=access_max_age,
                                path='/')
                resp.set_cookie('refresh', refresh_token,
                                httponly=True,
                                secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SECURE', not settings.DEBUG),
                                samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH_TOKEN_SAMESITE', 'Lax'),
                                max_age=refresh_max_age,
                                path='/')

                return resp
            else:
                return Response({
                    "error": "El enlace de verificación es inválido o ha expirado",
                    "code": "invalid_token"
                }, status=400)

        except Exception as e:
            return Response({
                "error": "Error al verificar email",
                "code": "verification_error",
                "detail": str(e) if settings.DEBUG else None
            }, status=400)

class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response({
                "error": "Email requerido"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            
            if user.is_email_verified:
                return Response({
                    "message": "Este email ya está verificado"
                }, status=status.HTTP_200_OK)

            # Generar nuevo token
            token = account_activation_token.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Construir URL de verificación
            verification_url = f"{settings.FRONTEND_URL}/verify-email/{uid}/{token}/"

            # Enviar email
            mail_subject = 'Activa tu cuenta'
            message = render_to_string('users/acc_active_email.html', {
                'user': user,
                'verification_link': verification_url,
            })
            
            email_msg = EmailMessage(
                subject=mail_subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email]
            )
            email_msg.content_subtype = "html"
            Thread(target=lambda: email_msg.send()).start()

            return Response({
                "message": "Email de verificación reenviado"
            }, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response({
                "error": "No existe una cuenta con este email"
            }, status=status.HTTP_404_NOT_FOUND)

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [UserRateThrottle]

    def post(self, request):
        try:
            logger.info(f"Intento de login desde IP: {request.META.get('REMOTE_ADDR')}")

            username = request.data.get("username", "").strip()
            password = request.data.get("password", "")
            remember_me = request.data.get("remember_me", False)

            if not username or not password:
                return Response({
                    "error": "Usuario y contraseña son requeridos",
                    "code": "missing_credentials"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Intentar autenticar con username o email
            user = None
            user_obj = None

            if '@' in username:
                try:
                    user_obj = User.objects.get(email=username.lower())
                except User.DoesNotExist:
                    user_obj = None
            else:
                user_obj = User.objects.filter(username=username).first()

            if user_obj is not None:
                if not getattr(user_obj, 'is_active', False) or not getattr(user_obj, 'is_email_verified', False):
                    return Response({
                        "error": "Debes verificar tu email antes de iniciar sesión",
                        "code": "email_not_verified",
                        "requires_verification": True,
                        "email": user_obj.email
                    }, status=status.HTTP_401_UNAUTHORIZED)

                user = authenticate(username=user_obj.username, password=password)

            if user is None:
                logger.warning(f"Fallo de autenticación para: {username}")
                return Response({
                    "error": "Credenciales inválidas",
                    "code": "invalid_credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)

            # Generar tokens y actualizar último login
            with transaction.atomic():
                refresh = RefreshToken.for_user(user)
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])

                if remember_me:
                    refresh.set_exp(lifetime=timezone.timedelta(days=30))
                else:
                    refresh.set_exp(lifetime=timezone.timedelta(hours=24))

                # Respuesta completa con UserSerializer
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)

                response_data = {
                    "access": access_token,
                    "refresh": refresh_token,
                    "user": UserSerializer(user, context={'request': request}).data,
                    "token_type": "Bearer"
                }

                logger.info(f"Login exitoso para usuario: {user.username}")
                resp = Response(response_data, status=status.HTTP_200_OK)

                # Setear cookies HttpOnly para access y refresh
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
            logger.error(f"Error en el login: {str(e)}", exc_info=True)
            return Response({
                "error": "Error interno del servidor",
                "code": "server_error",
                "detail": str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
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
            if not user.is_email_verified:
                return Response({
                    'error': 'Email no verificado',
                    'code': 'email_not_verified'
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
            # Verificar que el email esté verificado
            if not request.user.is_email_verified:
                return Response({
                    "error": "Debes verificar tu correo antes de realizar un depósito",
                    "code": "email_not_verified"
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
        if not user.is_email_verified:
            return "verify_email"
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
                status='pending',
                description='Solicitud de retiro BOOST a USDT'
            )

            if not transaction.complete_withdrawal():
                return Response({
                    'error': 'No se pudo procesar el retiro',
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
                        "Por favor espera hasta 32 horas como máximo para la ejecución y confirmación del retiro.\n\n"
                        "Gracias por usar BoostMe.\n"
                    )

                    html_message = render_to_string('users/withdrawal_email.html', {
                        'user': user,
                        'boost_amount': boost_amount,
                        'usdt_amount': transaction.usdt_amount,
                        'wait_hours': 32,
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
