# views.py
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from .tokens import account_activation_token
import logging
from rest_framework_simplejwt.views import TokenRefreshView
import re
from django.db import transaction
from django.core.mail import send_mail, EmailMessage
from rest_framework.throttling import UserRateThrottle
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from urllib.parse import urljoin
from .tokens import password_reset_token 
from threading import Thread
from .models import User, Transaction
from .serializers import UserSerializer,RegisterSerializer, ActivatePlanSerializer
from .tokens import account_activation_token
from django.conf import settings
from django.utils.encoding import force_str, force_bytes
from decimal import Decimal




logger = logging.getLogger(__name__)

User = get_user_model()


# views.py
@method_decorator(csrf_exempt, name='dispatch')

class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [UserRateThrottle]

    def post(self, request):
        try:
            logger.info(f"Intento de registro desde IP: {request.META.get('REMOTE_ADDR')}")

            # Datos
            email = request.data.get('email', '').strip().lower()
            username = request.data.get('username', '').strip()
            password = request.data.get('password', '')

            # Validaciones
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
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    is_active=False,
                    is_email_verified=False,
                    has_financial_activation=False
                )

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

                email_msg = EmailMessage(
                    subject=mail_subject,
                    body=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[email]
                )
                email_msg.content_subtype = "html"
                Thread(target=lambda: email_msg.send()).start()

                logger.info(f"Email de verificación enviado a {email}")

                return Response({
                    "message": "Registro exitoso. Revisa tu email para verificar tu cuenta.",
                    "user": UserSerializer(user).data,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "next_step": "verify_email"
                }, status=status.HTTP_201_CREATED)

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
                return Response({
                    "message": "Correo ya verificado. Puedes proceder con tu depósito.",
                    "user": UserSerializer(user).data,
                    "next_step": "deposit"
                }, status=200)

            if account_activation_token.check_token(user, token):
                user.is_email_verified = True
                user.save(update_fields=['is_email_verified'])
                
                return Response({
                    "message": "Correo verificado correctamente. Ahora puedes realizar tu depósito.",
                    "user": UserSerializer(user).data,
                    "next_step": "deposit"
                }, status=200)
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
            message = render_to_string('acc_active_email.html', {
                'user': user,
                'verification_url': verification_url,
            })
            
            send_mail(
                mail_subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )

            return Response({
                "message": "Email de verificación reenviado"
            }, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response({
                "error": "No existe una cuenta con este email"
            }, status=status.HTTP_404_NOT_FOUND)


@method_decorator(csrf_exempt, name='dispatch')
# users/views.py

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
            if '@' in username:
                # Si es un email, buscar el username asociado
                try:
                    user_obj = User.objects.get(email=username.lower())
                    user = authenticate(username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass
            else:
                # Si es un username, autenticar directamente
                user = authenticate(username=username, password=password)

            if user is None:
                logger.warning(f"Fallo de autenticación para: {username}")
                return Response({
                    "error": "Credenciales inválidas",
                    "code": "invalid_credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)

            if not getattr(user, 'is_email_verified', False):
                return Response({
                    "error": "Debes verificar tu email antes de iniciar sesión",
                    "code": "email_not_verified",
                    "requires_verification": True,
                    "email": user.email
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
                response_data = {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "user": UserSerializer(user).data,
                    "token_type": "Bearer"
                }

                logger.info(f"Login exitoso para usuario: {user.username}")
                return Response(response_data, status=status.HTTP_200_OK)

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
            # Obtener el refresh token del request
            refresh_token = request.data.get('refresh')
            
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
            user_data = UserSerializer(user).data
            
            response_data = {
                'access': access_token,
                'refresh': refresh_token_new,
                'token_type': 'Bearer',
                'expires_in': 300,  # 5 minutos en segundos
                'user': user_data
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'error': 'Error al renovar el token',
                'code': 'token_refresh_error',
                'detail': str(e) if settings.DEBUG else None
            }, status=status.HTTP_401_UNAUTHORIZED)

# users/views.py
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
                
                email_msg = EmailMessage(
                    subject=mail_subject,
                    body=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[email]
                )
                email_msg.content_subtype = "html"

                # Enviar email en hilo separado
                Thread(target=lambda: email_msg.send()).start()

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
            # Debug: Verificar el usuario y su estado
            print(f"Usuario: {request.user}")
            print(f"Email verificado: {request.user.is_email_verified}")
            print(f"Activación financiera: {request.user.has_financial_activation}")

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
            boost_equiv = amount_usdt * 10  # 1 USDT = 10 BOOST

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
                user_data = UserSerializer(user).data
                print(f"Datos del usuario actualizado: {user_data}")

            return Response({
                "message": "Depósito confirmado. Tu cuenta ya está activa.",
                "user": user_data,
                "boost_added": boost_equiv
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error en el depósito: {str(e)}")
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
            
            # Debug: Verificar el estado del usuario
            print(f"Usuario: {user.username}")
            print(f"Email verificado: {user.is_email_verified}")
            print(f"Activación financiera: {user.has_financial_activation}")
            print(f"Estado activo: {user.is_active}")

            # Serializar el usuario
            user_data = UserSerializer(user).data
            
            return Response({
                "user": user_data,
                "status": {
                    "is_email_verified": user.is_email_verified,
                    "has_financial_activation": user.has_financial_activation,
                    "is_active": user.is_active,
                    "next_step": self.get_next_step(user)
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error en UserStatusView: {str(e)}")
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
    permission_classes = []  # Sin autenticación requerida
    
    def post(self, request):
        try:
            # Usar el serializer para validar los datos
            serializer = ActivatePlanSerializer(data=request.data)
            
            if not serializer.is_valid():
                return Response({
                    'error': 'Datos inválidos',
                    'code': 'validation_error',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # El serializer se encarga de toda la lógica de activación
            result = serializer.save()
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error al activar plan: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al activar el plan',
                'code': 'activation_error',
                'detail': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import get_user_model
from .models import TaskCompletion, Transaction

User = get_user_model()

class UserHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        try:
            # Historial de tareas completadas / rachas
            tasks = TaskCompletion.objects.filter(user=user).order_by('-date_completed')

            # Historial de retiros / transacciones
            withdrawals = Transaction.objects.filter(user=user).order_by('-date')

            # Referidos
            referrals = Referral.objects.filter(inviter=user)

            # Datos del usuario
            data = {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "plan": user.plan_name if hasattr(user, 'plan_name') else None,
                    "boost_balance": user.boost_balance,
                    "registered_at": user.date_joined,
                    "last_activity": user.last_login,
                },
                "tasks_history": [
                    {
                        "task": t.task_name,
                        "completed_at": t.date_completed,
                        "streak": t.streak
                    } for t in tasks
                ],
                "withdrawals_history": [
                    {
                        "amount": w.amount,
                        "status": w.status,
                        "date": w.date
                    } for w in withdrawals
                ],
                "referrals": [
                    {
                        "referred_user_id": r.referred.id,
                        "referred_username": r.referred.username,
                        "joined_at": r.referred.date_joined
                    } for r in referrals
                ]
            }

            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": "No se pudo obtener el historial del usuario",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
