from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
import random
import string

class ReferralSystem(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='referral_system'  # Cambiado de 'referral_system_related'
    )
    referral_code = models.CharField(max_length=20, unique=True)
    referred_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referrals_made'
    )
    referral_count = models.IntegerField(default=0)
    total_referral_earnings = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'referrals_system'

    def __str__(self):
        return f"{self.user.username} - {self.referral_code}"

    def generate_referral_code(self):
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            if not ReferralSystem.objects.filter(referral_code=code).exists():
                return code

    def save(self, *args, **kwargs):
        if not self.referral_code:
            self.referral_code = self.generate_referral_code()
        super().save(*args, **kwargs)

    @property
    def can_withdraw(self):
        """Verifica si el usuario puede retirar según su plan y número de referidos."""
        plan_requirements = {
            'Free': 7,
            'Starter': 5,
            'Pro': 3,
            'Elite': 0
        }
        
        user_plan = self.user.plan_name if hasattr(self.user, 'plan_name') else 'Free'
        min_referrals = plan_requirements.get(user_plan, 7)
        
        return self.referral_count >= min_referrals

    def get_pending_earnings(self):
        """Calcula las ganancias pendientes de pago."""
        return self.earnings.filter(is_paid=False).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')

class ReferralEarning(models.Model):
    referral_system = models.ForeignKey(
        ReferralSystem,
        on_delete=models.CASCADE,
        related_name='earnings'
    )
    referred_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='referral_earnings'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        help_text="Tasa de comisión en decimal (ej: 0.05 para 5%)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_paid = models.BooleanField(default=False)

    class Meta:
        db_table = 'referrals_earnings'

    def __str__(self):
        return f"{self.referral_system.user.username} - {self.amount} USDT"

    @property
    def commission_percentage(self):
        """Retorna la tasa de comisión como porcentaje."""
        return float(self.commission_rate) * 100

class ReferralWithdrawal(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('approved', 'Aprobado'),
        ('rejected', 'Rechazado'),
    ]

    referral_system = models.ForeignKey(
        ReferralSystem,
        on_delete=models.CASCADE,
        related_name='withdrawals'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'referrals_withdrawals'

    def __str__(self):
        return f"{self.referral_system.user.username} - {self.amount} USDT ({self.status})"

    def approve(self):
        self.status = 'approved'
        self.processed_at = timezone.now()
        self.save()

    def reject(self, reason):
        self.status = 'rejected'
        self.notes = reason
        self.processed_at = timezone.now()
        self.save()
