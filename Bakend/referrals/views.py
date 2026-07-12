from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import timedelta
from .models import ReferralSystem, ReferralEarning, ReferralWithdrawal
from .serializers import (
    ReferralSystemSerializer,
    ReferralEarningSerializer,
    ReferralWithdrawalSerializer,
    ReferralStatsSerializer
)

User = get_user_model()

class ReferralPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class ReferralSystemViewSet(viewsets.ModelViewSet):
    serializer_class = ReferralSystemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ReferralSystem.objects.filter(user=self.request.user)

    def get_object(self):
        queryset = self.get_queryset()
        obj = queryset.first()
        if not obj:
            # Crear el sistema de referidos si no existe
            obj = ReferralSystem.objects.create(user=self.request.user)
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Obtener estadísticas detalladas del sistema de referidos."""
        try:
            referral_system = self.get_object()
            
            # Calcular estadísticas
            total_earnings = referral_system.total_referral_earnings
            pending_earnings = ReferralEarning.objects.filter(
                referral_system=referral_system,
                is_paid=False
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            paid_earnings = total_earnings - pending_earnings
            
            # Referidos activos (últimos 30 días)
            thirty_days_ago = timezone.now() - timedelta(days=30)
            active_referrals = User.objects.filter(
                referral_system__referred_by=request.user,
                last_login__gte=thirty_days_ago
            ).count()
            
            stats = {
                'referral_code': referral_system.referral_code,
                'total_referrals': referral_system.referral_count,
                'active_referrals': active_referrals,
                'total_earnings': total_earnings,
                'pending_earnings': pending_earnings,
                'paid_earnings': paid_earnings,
                'can_withdraw': referral_system.can_withdraw,
                'min_withdrawal_amount': 10.00,
                'commission_rate': self.get_commission_rate(request.user.plan_name)
            }
            
            serializer = ReferralStatsSerializer(stats)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get_commission_rate(self, plan_name):
        """Obtener la tasa de comisión según el plan"""
        commission_rates = {
            'Free': 0.05,
            'Starter': 0.10,
            'Pro': 0.15,
            'Elite': 0.20
        }
        return commission_rates.get(plan_name, 0.05)

    @action(detail=False, methods=['get'])
    def link(self, request):
        """Obtener el enlace de referido del usuario."""
        try:
            from django.conf import settings
            
            referral_system = self.get_object()
            referral_code = referral_system.referral_code
            
            # Usar la URL configurada en settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5174')
            referral_link = f"{frontend_url}/register?ref={referral_code}"
            
            return Response({
                'referral_code': referral_code,
                'referral_link': referral_link
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class ReferralEarningViewSet(viewsets.ModelViewSet):
    serializer_class = ReferralEarningSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = ReferralPagination

    def get_queryset(self):
        queryset = ReferralEarning.objects.filter(
            referral_system__user=self.request.user
        )
        
        # Filtros opcionales
        is_paid = self.request.query_params.get('is_paid')
        if is_paid is not None:
            queryset = queryset.filter(is_paid=is_paid.lower() == 'true')
        
        return queryset

class ReferralWithdrawalViewSet(viewsets.ModelViewSet):
    serializer_class = ReferralWithdrawalSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = ReferralPagination

    def get_queryset(self):
        queryset = ReferralWithdrawal.objects.filter(
            referral_system__user=self.request.user
        )
        
        # Filtros opcionales
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset

    def create(self, request, *args, **kwargs):
        """Solicitar retiro de ganancias por referidos."""
        try:
            amount = request.data.get('amount')
            if not amount:
                return Response(
                    {'error': 'El monto es requerido'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            referral_system = request.user.referral_system
            
            # Verificar requisitos
            if not referral_system.can_withdraw:
                return Response(
                    {'error': 'No cumples con los requisitos mínimos de referidos para retirar'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verificar monto mínimo
            if float(amount) < 10.00:
                return Response(
                    {'error': 'El monto mínimo de retiro es de $10.00 USDT'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verificar saldo disponible
            pending_earnings = ReferralEarning.objects.filter(
                referral_system=referral_system,
                is_paid=False
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            if float(amount) > float(pending_earnings):
                return Response(
                    {'error': 'El monto excede tus ganancias disponibles'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Crear solicitud de retiro
            withdrawal = ReferralWithdrawal.objects.create(
                referral_system=referral_system,
                amount=amount
            )

            serializer = self.get_serializer(withdrawal)
            return Response({
                'message': 'Solicitud de retiro creada exitosamente',
                'withdrawal': serializer.data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class ReferralRegistrationViewSet(viewsets.ViewSet):
    """ViewSet para el registro de usuarios con código de referido."""
    
    def create(self, request):
        """Registrar un nuevo usuario con código de referido."""
        try:
            referral_code = request.data.get('referral_code')
            username = request.data.get('username')
            email = request.data.get('email')
            password = request.data.get('password')

            if not all([username, email, password]):
                return Response(
                    {'error': 'Todos los campos son requeridos'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verificar si el usuario ya existe
            if User.objects.filter(username=username).exists():
                return Response(
                    {'error': 'El nombre de usuario ya está en uso'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if User.objects.filter(email=email).exists():
                return Response(
                    {'error': 'El email ya está registrado'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verificar código de referido si se proporciona
            referrer = None
            if referral_code:
                try:
                    referrer_system = ReferralSystem.objects.get(referral_code=referral_code)
                    referrer = referrer_system.user
                except ReferralSystem.DoesNotExist:
                    return Response(
                        {'error': 'Código de referido inválido'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Crear nuevo usuario usando create en lugar de create_user
            # Esto evita conflictos con el save personalizado del modelo User
            user = User.objects.create(
                username=username,
                email=email,
                is_active=False,
                is_email_verified=False,
                has_financial_activation=False
            )
            # Establecer la contraseña por separado
            user.set_password(password)
            user.save()

            # Asignar referido si hay código
            if referrer:
                # Obtener el ReferralSystem que ya fue creado por el save del modelo User
                user_referral_system = user.referral_system
                user_referral_system.referred_by = referrer
                user_referral_system.save()
                
                # Actualizar contador de referidos del referidor
                referrer_system = referrer.referral_system
                referrer_system.referral_count += 1
                referrer_system.save()

            return Response({
                'message': 'Usuario registrado exitosamente',
                'user_id': user.id
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
