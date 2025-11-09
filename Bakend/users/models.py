# models.py
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone
from decimal import Decimal

class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_email_verified = models.BooleanField(default=False)

    # 💰 Balance en USDT (referencia global)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # 🪙 Sistema BOOST
    boost_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    purchased_boost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    earned_boost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    # 🔐 Estado financiero del usuario
    has_financial_activation = models.BooleanField(default=False)
    current_week_withdrawn = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    weekly_limit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('100.00'))

    # 🌟 Nivel o plan actual
    level = models.IntegerField(default=1)
    plan_name = models.CharField(max_length=50, default='Free')
    plan_expiry_date = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']
   

    def __str__(self):
        return self.username

    @property
    def total_boost(self):
        return self.purchased_boost + self.earned_boost

class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('deposit', 'Depósito'),
        ('withdrawal', 'Retiro'),
        ('conversion', 'Conversión'),
        ('reward', 'Recompensa'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('completed', 'Completada'),
        ('failed', 'Fallida'),
        ('cancelled', 'Cancelada'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transactions'
    )

    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # 💰 Monto en USDT (para depósitos y retiros)
    usdt_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    # 🪙 Monto en BOOST (para conversiones o tareas)
    boost_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    # 🧾 Tasa de conversión fija (1 USDT = 10 BOOST)
    CONVERSION_RATE = Decimal('10.00')

    created_at = models.DateTimeField(default=timezone.now)
    description = models.TextField(blank=True, null=True)
    
    class Transation(models.Model):
        class Meta:
            db_table ='Transation'

    def __str__(self):
        return f"{self.user.username} - {self.transaction_type} ({self.status})"

    def convert_usdt_to_boost(self):
        """Convierte USDT a BOOST usando la tasa fija 1 USDT = 10 BOOST."""
        self.boost_amount = self.usdt_amount * self.CONVERSION_RATE
        return self.boost_amount

    def convert_boost_to_usdt(self):
        """Convierte BOOST a USDT (para retiros simulados)."""
        return self.boost_amount / self.CONVERSION_RATE

    def complete_deposit(self):
        """Completa un depósito y activa al usuario si es su primero."""
        if self.transaction_type != 'deposit':
            return False

        self.status = 'completed'
        boost_generated = self.convert_usdt_to_boost()

        user = self.user
        user.purchased_boost += boost_generated
        user.boost_balance += boost_generated
        user.balance += self.usdt_amount

        # ✅ Activar cuenta si es el primer depósito
        if not user.has_financial_activation:
            user.has_financial_activation = True
            user.is_active = True

        user.save()
        self.save()
        return True

    def complete_withdrawal(self):
        """Procesa un retiro, restando BOOST del balance."""
        if self.transaction_type != 'withdrawal':
            return False

        user = self.user
        if user.boost_balance < self.boost_amount:
            self.status = 'failed'
            self.description = "Saldo BOOST insuficiente."
            self.save()
            return False

        user.boost_balance -= self.boost_amount
        user.current_week_withdrawn += self.boost_amount
        user.save()

        self.status = 'completed'
        self.save()
        return True

class UserPlan(models.Model):
    PLAN_CHOICES = [
        ('Free', 'Free'),
        ('Starter', 'Starter'),
        ('Pro', 'Pro'),
        ('Elite', 'Elite'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_plan'
    )
    plan_name = models.CharField(max_length=50, choices=PLAN_CHOICES)
    daily_tasks = models.IntegerField(default=3)
    bonus_percentage = models.IntegerField(default=0)
    weekly_withdrawal_limit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('5.00'))
    price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class UserPlan(models.Model):
        class Meta:
            db_table = 'user_plan'

    def __str__(self):
        return f"{self.user.username} - {self.plan_name}"

    def activate_plan(self):
        """Activa el plan y establece la fecha de expiración."""
        self.is_active = True
        self.updated_at = timezone.now()
        
        # Establecer fecha de expiración (30 días desde la activación)
        if self.plan_name != 'Free':
            self.user.plan_expiry_date = timezone.now() + timezone.timedelta(days=30)
        
        # Ajustar límites y tareas según el plan
        plan_settings = {
            'Free':    {'daily_tasks': 3, 'bonus_percentage': 0, 'weekly_withdrawal_limit': 5},
            'Starter': {'daily_tasks': 5, 'bonus_percentage': 5, 'weekly_withdrawal_limit': 50},
            'Pro':     {'daily_tasks': 7, 'bonus_percentage': 10, 'weekly_withdrawal_limit': 200},
            'Elite':   {'daily_tasks': 10, 'bonus_percentage': 20, 'weekly_withdrawal_limit': 1000},
        }

        settings = plan_settings.get(self.plan_name, plan_settings['Free'])
        self.daily_tasks = settings['daily_tasks']
        self.bonus_percentage = settings['bonus_percentage']
        self.weekly_withdrawal_limit = Decimal(settings['weekly_withdrawal_limit'])
        
        self.save()
        self.user.save()
        
        


class TaskCompletion(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="task_history")
    task_name = models.CharField(max_length=255)
    completed_at = models.DateTimeField(auto_now_add=True)
    streak_count = models.IntegerField(default=1)  # días consecutivos
    
    class TaskCompletion(models.Model):
        class Meta:
            db_table = 'task_completion'

    def __str__(self):
        return f"{self.user.username} - {self.task_name} - {self.completed_at}"

