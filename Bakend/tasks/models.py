from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
import random

class Task(models.Model):
    TASK_TYPES = [
        ('like', 'Dar Like'),
        ('follow', 'Seguir Cuenta'),
        ('video', 'Ver Video'),
        ('survey', 'Encuesta'),
        ('review', 'Reseña'),
        ('profile', 'Completar Perfil'),
        ('social', 'Actividad Social'),
        ('referral', 'Invitar Referido'),
        ('goal', 'Objetivo'),
        ('dashboard', 'Panel'),
    ]

    CONTENT_TYPES = [
        ('image', 'Imagen'),
        ('video', 'Video'),
        ('text', 'Texto'),
        ('profile', 'Perfil'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('completed', 'Completada'),
        ('expired', 'Expirada'),
    ]

    # Campos básicos
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    
    task_type = models.CharField(max_length=20, choices=TASK_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    boost_reward = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('2.00'))
    temp_field = models.CharField(max_length=50, default='temp')
    
    # Fechas importantes
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Contenido real (para proveedores externos como AdGate)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES, null=True, blank=True, default='text')
    content_url = models.URLField(null=True, blank=True, help_text="URL del contenido a interactuar (perfil, video, etc)")
    content_data = models.JSONField(default=dict, null=True, blank=True, help_text="Datos adicionales del contenido")
    description = models.TextField(null=True, blank=True)
    
    # Campos de acción (lo que el usuario debe hacer)
    action_type = models.CharField(max_length=50, default='view', help_text="like, follow, watch, survey, etc")
    action_url = models.URLField(blank=True, null=True, help_text="URL específica de la acción (ej: perfil a seguir)")
    action_data = models.JSONField(default=dict, blank=True, null=True, help_text="Datos adicionales de la acción")
    
    # Campos heredados (mantener para compatibilidad)
    simulated_url = models.URLField(blank=True, null=True, help_text="[Deprecated] Usar action_url")
    simulated_content = models.TextField(blank=True, null=True, help_text="[Deprecated] Usar description")
    simulated_action = models.CharField(max_length=50, default='like', help_text="[Deprecated] Usar action_type")
    simulated_data = models.JSONField(default=dict, blank=True, null=True, help_text="[Deprecated] Usar action_data")
    
    class Meta:
        db_table = 'task'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.task_type} ({self.status})"

    def get_content(self):
        """Obtiene el contenido de la tarea para el frontend."""
        # Priorizar nuevos campos de acción
        if self.action_url or self.action_type:
            return {
                'type': self.content_type or 'text',
                'description': self.description,
                'action_type': self.action_type,
                'action_url': self.action_url,  # URL específica a interactuar
                'action_data': self.action_data
            }
        
        # Fallback a campos heredados de simulación
        if self.simulated_url and self.simulated_action:
            return {
                'type': 'simulated',
                'description': self.simulated_content,
                'action_type': self.simulated_action,
                'action_url': self.simulated_url,
                'action_data': self.simulated_data
            }
        
        # Contenido por defecto
        return {
            'type': 'text',
            'description': self.description,
            'action_type': self.action_type
        }

    def complete_task(self, watched_seconds=None):
        """Marca la tarea como completada y actualiza los BOOST del usuario."""
        if self.status != 'pending':
            return False

        self.status = 'completed'
        self.completed_at = timezone.now()

        if self.task_type == 'video' and watched_seconds is not None:
            content_data = self.content_data or {}
            content_data['watched_seconds'] = watched_seconds
            self.content_data = content_data
        
        # Actualizar BOOST del usuario
        user = self.user
        user.earned_boost += self.boost_reward
        user.boost_balance += self.boost_reward
        
        # Actualizar racha de tareas
        task_completion, created = TaskCompletion.objects.get_or_create(
            user=user,
            task_name=self.task_type,
            defaults={'completed_at': timezone.now()}
        )
        
        if not created:
            last_completion = TaskCompletion.objects.filter(
                user=user
            ).order_by('-completed_at').first()
            
            if last_completion:
                days_diff = (timezone.now() - last_completion.completed_at).days
                if days_diff <= 1:
                    task_completion.streak_count = last_completion.streak_count + 1
                else:
                    task_completion.streak_count = 1
            
            task_completion.completed_at = timezone.now()
            task_completion.save()
        
        # Procesar ganancias por referido
        if hasattr(user, 'referral_system_related') and user.referral_system_related.referred_by:
            from referrals.models import ReferralEarning
            from users.models import Transaction
            
            referrer = user.referral_system_related.referred_by
            commission_rates = {
                'Free': 0.05,
                'Starter': 0.10,
                'Pro': 0.15,
                'Elite': 0.20
            }
            
            commission_rate = commission_rates.get(referrer.plan_name, 0.05)
            referral_earning = float(self.boost_reward) * commission_rate
            
            # Crear registro de ganancia por referido
            ReferralEarning.objects.create(
                referral_system=referrer.referral_system_related,
                referred_user=user,
                amount=referral_earning,
                commission_rate=commission_rate
            )
            
            # Actualizar total de ganancias del referidor
            referrer.referral_system_related.total_referral_earnings += referral_earning
            referrer.referral_system_related.save()
            
            # Crear transacción para el referidor
            Transaction.objects.create(
                user=referrer,
                transaction_type='referral',
                usdt_amount=referral_earning / 10,  # Convertir BOOST a USDT
                status='completed'
            )
        
        user.save()
        self.save()
        return True

    def is_expired(self):
        """Verifica si la tarea ha expirado."""
        if self.expires_at and timezone.now() > self.expires_at:
            self.status = 'expired'
            self.save()
            return True
        return False

class TaskCompletion(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="task_completions"
    )
    task_name = models.CharField(max_length=255)
    completed_at = models.DateTimeField(auto_now_add=True)
    streak_count = models.IntegerField(default=1)
    
    class Meta:
        db_table = 'tasks_task_completion'

    def __str__(self):
        return f"{self.user.username} - {self.task_name} - {self.completed_at}"
