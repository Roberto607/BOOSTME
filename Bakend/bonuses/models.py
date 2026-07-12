from django.db import models

# Create your models here.
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class BonusType(models.Model):
    BONUS_TYPES = [
        ('streak', 'Racha'),
        ('tasks', 'Tareas Completadas'),
        ('plan', 'Especial del Plan'),
        ('referral', 'Referidos'),
    ]
    
    name = models.CharField(max_length=50)
    description = models.TextField()
    bonus_type = models.CharField(max_length=20, choices=BONUS_TYPES)
    value = models.DecimalField(max_digits=10, decimal_places=2)  # Cantidad de BOOST
    requirement_value = models.IntegerField()  # Valor requerido para obtener el bono
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class UserBonus(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('claimed', 'Reclamado'),
        ('expired', 'Expirado'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    bonus_type = models.ForeignKey(BonusType, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    claimed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.bonus_type.name}"

class UserStreak(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    current_streak = models.IntegerField(default=0)
    max_streak = models.IntegerField(default=0)
    last_activity = models.DateField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - Racha: {self.current_streak}"
