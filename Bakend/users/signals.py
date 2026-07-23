from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import UserPlan
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

@receiver(post_save, sender=User)
def create_user_plan(sender, instance, created, **kwargs):
    """Crea un plan Free automáticamente cuando un usuario se registra."""
    if not created:
        return

    try:
        plan = UserPlan.objects.create(
            user=instance,
            plan_name='Free',
            is_active=True
        )
    except Exception:
        return

    # Establecer periodo de prueba de 30 días para usuarios Free
    try:
        expiry = timezone.now() + timedelta(days=30)
        instance.plan_expiry_date = expiry
        instance.save(update_fields=['plan_expiry_date'])
    except Exception:
        # No fallar el registro por un problema menor en la fecha
        pass

@receiver(post_save, sender=UserPlan)
def activate_user_plan(sender, instance, created, **kwargs):
    """Activa el plan y genera tareas cuando se crea o actualiza."""
    # Evitar recursión si la instancia está marcando que su propio
    # método `activate_plan` está guardando la instancia.
    if getattr(instance, '_suppress_activate', False):
        return

    # Sólo ejecutar la activación automáticamente cuando el UserPlan
    # se crea inicialmente y viene marcado como activo.
    if created and instance.is_active:
        try:
            instance.activate_plan()
        except Exception:
            return
