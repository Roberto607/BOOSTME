from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone
from decimal import Decimal

class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_email_verified = models.BooleanField(default=False)
    wallet_address = models.CharField(max_length=66, blank=True, null=True, unique=True)
    wallet_network = models.CharField(max_length=20, blank=True, null=True, default='polygon')
    is_wallet_verified = models.BooleanField(default=False)
    wallet_nonce = models.CharField(max_length=128, blank=True, null=True)
    wallet_nonce_created_at = models.DateTimeField(null=True, blank=True)

    # 📝 Información del perfil
    bio = models.TextField(blank=True, null=True)
    country = models.CharField(max_length=50, blank=True, null=True)
    city = models.CharField(max_length=50, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    join_date = models.DateTimeField(auto_now_add=True, null=True, blank=True)



    # 💰 Balance en USDT (referencia global)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    # 🪙 Sistema BOOST
    boost_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    purchased_boost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    earned_boost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    # 🔐 Estado financiero del usuario
    has_financial_activation = models.BooleanField(default=False)
    current_week_withdrawn = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    weekly_limit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('100.00'))

    # 🌟 Nivel o plan actual
    level = models.IntegerField(default=1)
    plan_name = models.CharField(max_length=50, default='Free')
    plan_expiry_date = models.DateTimeField(null=True, blank=True)

    # 🎯 Preferencias de tareas basadas en la encuesta inicial
    task_preferences = models.JSONField(default=dict, blank=True, null=True)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return self.username

    @property
    def is_verified(self):
        return self.is_email_verified or self.is_wallet_verified

    @property
    def total_boost(self):
        return self.purchased_boost + self.earned_boost

    @property
    def can_withdraw(self):
        # No permitir retiros si el plan expiró y no tiene activación financiera (pago)
        not_expired = True
        try:
            if self.plan_expiry_date:
                not_expired = self.plan_expiry_date > timezone.now()
        except Exception:
            not_expired = True

        return (
            self.earned_boost > 0 and
            self.current_week_withdrawn < self.weekly_limit and
            (not_expired or self.has_financial_activation)
        )

    def save(self, *args, **kwargs):
        # Guardar una sola vez. Evitar llamadas dobles a super().save()
        # que causan inserciones duplicadas (IntegrityError).
        super().save(*args, **kwargs)

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

    # 🧾 Tasa de conversión fija (1 USDT = 100 BOOST)
    CONVERSION_RATE = Decimal('100.00')

    created_at = models.DateTimeField(default=timezone.now)
    description = models.TextField(blank=True, null=True)
    
    # 🔗 Datos de blockchain (para retiros en Polygon)
    user_wallet_address = models.CharField(max_length=66, blank=True, null=True)  # 0x...
    # Network donde enviar USDT: 'polygon', 'bsc', 'tron', 'omni'
    blockchain_network = models.CharField(max_length=20, default='polygon')
    tx_hash = models.CharField(max_length=66, blank=True, null=True)  # Hash de la transacción
    tx_status = models.CharField(
        max_length=20,
        choices=[
            ('pending_blockchain', 'Esperando confirmación blockchain'),
            ('confirmed', 'Confirmada en blockchain'),
            ('failed_blockchain', 'Fallida en blockchain'),
        ],
        blank=True,
        null=True
    )
    
    class Meta:
        db_table = 'transaction'

    def __str__(self):
        return f"{self.user.username} - {self.transaction_type} ({self.status})"

    def convert_usdt_to_boost(self):
        """Convierte USDT a BOOST usando la tasa fija 1 USDT = 100 BOOST."""
        # Asegurar que trabajamos con Decimal para evitar TypeError
        try:
            usdt = Decimal(str(self.usdt_amount))
        except Exception:
            usdt = Decimal(self.usdt_amount)
        self.boost_amount = usdt * self.CONVERSION_RATE
        return self.boost_amount

    def convert_boost_to_usdt(self):
        """Convierte BOOST a USDT (para retiros simulados)."""
        try:
            boost = Decimal(str(self.boost_amount))
        except Exception:
            boost = Decimal(self.boost_amount)
        return boost / self.CONVERSION_RATE

    def complete_deposit(self):
        """Completa un depósito y activa al usuario si es su primero."""
        if self.transaction_type != 'deposit':
            return False

        self.status = 'completed'
        boost_generated = self.convert_usdt_to_boost()

        user = self.user
        # Asegurar tipos Decimal antes de operar con los balances
        try:
            usdt = Decimal(str(self.usdt_amount))
        except Exception:
            usdt = Decimal(self.usdt_amount)

        user.purchased_boost += boost_generated
        user.boost_balance += boost_generated
        user.balance += usdt
        self.usdt_amount = usdt

        # ✅ Activar cuenta si es el primer depósito
        if not user.has_financial_activation:
            user.has_financial_activation = True
            user.is_active = True

        user.save()
        self.save()
        return True

    def complete_withdrawal(self):
        """
        Procesa un retiro, enviando USDT realmente a la wallet del usuario en Polygon.
        """
        if self.transaction_type != 'withdrawal':
            return False

        user = self.user
        
        # Asegurar que `boost_amount` se maneje como Decimal
        try:
            boost_dec = Decimal(str(self.boost_amount))
        except Exception:
            boost_dec = Decimal(self.boost_amount)

        # Validar saldos
        if user.boost_balance < boost_dec:
            self.status = 'failed'
            self.description = "Saldo BOOST insuficiente."
            self.save()
            return False

        if user.earned_boost < boost_dec:
            self.status = 'failed'
            self.description = "Solo puedes retirar BOOST ganados por tareas."
            self.save()
            return False

        # Obtener wallet del usuario
        if not self.user_wallet_address:
            self.status = 'failed'
            self.description = "No hay dirección de wallet registrada."
            self.save()
            return False

        # Convertir BOOST a USDT
        usdt_amount = boost_dec / self.CONVERSION_RATE
        
        # Enviar USDT según la red configurada para la transacción
        from users.blockchain import polygon_manager, bsc_manager, tron_manager

        network = (self.blockchain_network or 'polygon').lower()

        if network == 'polygon':
            manager = polygon_manager
        elif network == 'bsc':
            manager = bsc_manager
        elif network == 'tron':
            manager = tron_manager
        else:
            # Por ahora no soportamos retiros automáticos en Omni
            self.status = 'failed'
            self.description = f"Red '{network}' no soportada para retiros automáticos."
            self.save()
            return False

        if not manager:
            self.status = 'failed'
            self.description = "Blockchain manager no disponible para la red solicitada."
            self.save()
            return False

        result = manager.send_usdt(self.user_wallet_address, float(usdt_amount))
        
        if not result['success']:
            self.status = 'failed'
            self.description = f"Error en blockchain: {result['error']}"
            self.save()
            return False
        
        # Transacción enviada con éxito
        self.tx_hash = result['tx_hash']
        self.tx_status = 'pending_blockchain'
        
        # Actualizar balances del usuario
        user.boost_balance -= boost_dec
        user.earned_boost -= boost_dec
        user.current_week_withdrawn += boost_dec
        user.balance += usdt_amount

        self.boost_amount = boost_dec
        self.usdt_amount = usdt_amount
        self.status = 'pending'  # Pendiente de confirmación blockchain
        self.description = f"Retiro pendiente confirmación. TX: {result['tx_hash']}"

        # Activar financiero si es el primer retiro
        if not user.has_financial_activation:
            user.has_financial_activation = True
            user.is_active = True

        user.save()
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
    
    class Meta:
        db_table = 'user_plan'

    def __str__(self):
        return f"{self.user.username} - {self.plan_name}"

    def generate_daily_tasks(self):
        """Genera las tareas diarias según el plan del usuario."""
        if not self.is_active:
            return

        # Eliminar tareas pendientes antiguas
        self.user.tasks.filter(status='pending').delete()

        # Tipos de tareas y sus recompensas
        task_types = [
            {'type': 'like', 'reward': 2.00, 'description': 'Dar like a una publicación'},
            {'type': 'follow', 'reward': 3.00, 'description': 'Seguir una cuenta'},
            {'type': 'video', 'reward': 2.00, 'description': 'Ver un video'},
            {'type': 'survey', 'reward': 5.00, 'description': 'Completar encuesta'},
            {'type': 'review', 'reward': 4.00, 'description': 'Escribir una reseña'}
        ]

        # Crear nuevas tareas según el plan
        from tasks.models import Task
        from django.utils import timezone
        import random

        for i in range(self.daily_tasks):
            task_type = random.choice(task_types)
            Task.objects.create(
                user=self.user,
                task_type=task_type['type'],
                boost_reward=task_type['reward'],
                description=task_type['description'],
                expires_at=timezone.now() + timezone.timedelta(days=1)
            )

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
        
        # Evitar que el post_save dispare de nuevo `activate_user_plan`
        # durante este guardado: marcamos un flag temporal en la
        # instancia que la señal comprueba.
        self._suppress_activate = True
        try:
            self.save()
        finally:
            if hasattr(self, '_suppress_activate'):
                delattr(self, '_suppress_activate')

        self.user.save()

        # Generar tareas diarias después de activar el plan
        self.generate_daily_tasks()

    def save(self, *args, **kwargs):
        """Override del save para generar tareas si es un nuevo plan activo."""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new and self.is_active:
            self.generate_daily_tasks()
