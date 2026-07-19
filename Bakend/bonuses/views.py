from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone
from django.db.models import Sum
from .models import BonusType, UserBonus, UserStreak
from .serializers import BonusTypeSerializer, UserBonusSerializer, UserStreakSerializer


class BonusTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BonusType.objects.filter(is_active=True)
    serializer_class = BonusTypeSerializer
    permission_classes = [AllowAny]


class UserBonusViewSet(viewsets.ModelViewSet):
    queryset = UserBonus.objects.all()
    serializer_class = UserBonusSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        if not self.request.user or not self.request.user.is_authenticated:
            return UserBonus.objects.none()
        return UserBonus.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    
    def bonus_stats(self, request):
        """Endpoint para obtener estadísticas de bonos del usuario"""
        user_bonuses = self.get_queryset()
        
        stats = {
            'totalEarned': user_bonuses.filter(status='claimed').aggregate(
                total=Sum('amount')
            )['total'] or 0,
            'pendingCount': user_bonuses.filter(status='pending').count(),
            'claimedCount': user_bonuses.filter(status='claimed').count()
        }
        
        return Response(stats)

    @action(detail=False, methods=['post'])
    def claim_bonus(self, request):
        bonus_id = request.data.get('bonus_id')
        try:
            bonus = UserBonus.objects.get(
                id=bonus_id,
                user=request.user,
                status='pending'
            )
            
            # Verificar si el bono está completo
            if bonus.current_progress < bonus.requirement_value:
                return Response(
                    {'error': 'Aún no completas los requisitos para este bono'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            bonus.status = 'claimed'
            bonus.claimed_at = timezone.now()
            bonus.save()
            
            return Response({
                'message': 'Bono reclamado exitosamente',
                'amount': bonus.amount
            })
        except UserBonus.DoesNotExist:
            return Response(
                {'error': 'Bono no encontrado o ya reclamado'},
                status=status.HTTP_400_BAD_REQUEST
            )

class UserStreakViewSet(viewsets.ModelViewSet):
    queryset = UserStreak.objects.all()
    serializer_class = UserStreakSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        if not self.request.user or not self.request.user.is_authenticated:
            return UserStreak.objects.none()
        return UserStreak.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Endpoint para obtener la racha actual del usuario"""
        if not request.user or not request.user.is_authenticated:
            return Response({'current_streak': 0, 'max_streak': 0})

        streak = self.get_queryset().first()
        if not streak:
            streak = UserStreak.objects.create(
                user=request.user,
                current_streak=0,
                max_streak=0
            )
        serializer = self.get_serializer(streak)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def update_streak(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({'detail': 'Authentication credentials were not provided.'}, status=status.HTTP_401_UNAUTHORIZED)

        streak, created = UserStreak.objects.get_or_create(
            user=request.user,
            defaults={'current_streak': 1, 'max_streak': 1}
        )
        
        if not created:
            today = timezone.now().date()
            if streak.last_activity == today:
                return Response({'message': 'Racha ya actualizada hoy'})
            
            yesterday = today - timezone.timedelta(days=1)
            if streak.last_activity == yesterday:
                streak.current_streak += 1
            else:
                streak.current_streak = 1
            
            streak.max_streak = max(streak.max_streak, streak.current_streak)
            streak.last_activity = today
            streak.save()
        
        return Response({
            'current_streak': streak.current_streak,
            'max_streak': streak.max_streak
        })
