from rest_framework import serializers
from .models import User, UserPlan, Transaction
from django.utils import timezone
from django.contrib.auth import authenticate  # ← Importar authenticate aquí
from django.conf import settings

class UserPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPlan
        fields = [
            'plan_name',
            'daily_tasks',
            'bonus_percentage',
            'weekly_withdrawal_limit',
            'price',
            'is_active',
            'created_at',
            'updated_at'
        ]

class UserSerializer(serializers.ModelSerializer):
    user_plan = UserPlanSerializer(read_only=True)
    total_boost = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    join_date = serializers.DateTimeField(format='%Y-%m-%d', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'bio',
            'country',
            'city',
            'phone',
            'photo',
            'photo_url',
            'join_date',
            'is_email_verified',
            'has_financial_activation',
            'balance',
            'boost_balance',
            'purchased_boost',
            'earned_boost',
            'total_boost',
            'weekly_limit',
            'current_week_withdrawn',
            'level',
            'is_active',
            'plan_name',
            'plan_expiry_date',
            'user_plan'
        ]
        read_only_fields = [
            'id',
            'username',
            'email',
            'join_date',
            'is_email_verified',
            'balance',
            'boost_balance',
            'purchased_boost',
            'earned_boost',
            'total_boost',
            'weekly_limit',
            'current_week_withdrawn',
            'is_active',
            'plan_name',
            'plan_expiry_date'
        ]

    def get_total_boost(self, obj):
        return float(obj.purchased_boost + obj.earned_boost)

    def get_photo_url(self, obj):
        if obj.photo:
            # Construir URL que sea accesible desde el navegador cliente
            # Usar localhost:8000 para desarrollo local, o configurar via BACKEND_URL
            backend_url = getattr(settings, 'BACKEND_URL', 'http://localhost:8000')
            return f"{backend_url}{obj.photo.url}"
        return None

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

    def validate_email(self, value):
        request = self.context.get('request')
        if request is None:
            return value
        user = request.user
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Este email ya está en uso.")
        return value

    def validate_username(self, value):
        request = self.context.get('request')
        if request is None:
            return value
        user = request.user
        if User.objects.filter(username=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Este nombre de usuario ya está en uso.")
        return value

    def validate_phone(self, value):
        if value and not value.isdigit():
            raise serializers.ValidationError("El teléfono debe contener solo números.")
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Convertir campos decimales a float para mejor manejo en el frontend
        decimal_fields = [
            'boost_balance',
            'purchased_boost',
            'earned_boost',
            'weekly_limit',
            'current_week_withdrawn'
        ]
        for field in decimal_fields:
            if data.get(field) is not None:
                data[field] = float(data[field])
        return data


class RegisterSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'password2')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Las contraseñas no coinciden")
        return data

    def create(self, validated_data):
        try:
            # Intentar crear el usuario usando create_user estándar
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password'],
                is_active=False,
                is_email_verified=False,
                has_financial_activation=False
            )
            return user
        except RecursionError as e:
            # Si hay recursión, intentar crear el usuario de forma manual
            user = User(
                username=validated_data['username'],
                email=validated_data['email'],
                is_active=False,
                is_email_verified=False,
                has_financial_activation=False
            )
            user.set_password(validated_data['password'])
            user.save()
            return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    remember_me = serializers.BooleanField(default=False)

    def validate(self, data):
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            raise serializers.ValidationError("Usuario y contraseña son requeridos")

        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError("Usuario o contraseña incorrectos")

        if not user.is_email_verified:
            raise serializers.ValidationError("Email no verificado")

        # Devuelve estado completo del usuario
        return UserSerializer(user).data

class WithdrawSerializer(serializers.Serializer):
    boost_amount = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate_boost_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("El monto de retiro debe ser mayor a 0")
        return value

class ActivatePlanSerializer(serializers.Serializer):
    email = serializers.EmailField()
    plan = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    def validate_plan(self, value):
        valid_plans = ['Free', 'Starter', 'Pro', 'Elite']
        if value not in valid_plans:
            raise serializers.ValidationError("Plan no válido")
        return value

    def validate(self, data):
        plan = data.get('plan')
        amount = data.get('amount', 0)

        if plan != 'Free' and amount <= 0:
            raise serializers.ValidationError("El monto debe ser mayor a 0 para planes pagos")
        return data

    def save(self):
        plan_name = self.validated_data['plan']
        amount = self.validated_data.get('amount', 0)
        email = self.validated_data['email']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("No existe una cuenta con este email")

        if not user.is_email_verified:
            raise serializers.ValidationError("Por favor, verifica tu correo electrónico antes de continuar")

        if user.has_financial_activation:
            raise serializers.ValidationError("Ya tienes un plan activo")

        user_plan, created = UserPlan.objects.get_or_create(user=user)

        # Configuración de planes
        plans_config = {
            'Free': {'daily_tasks': 3, 'bonus': 0, 'weekly_limit': 5},
            'Starter': {'daily_tasks': 5, 'bonus': 10, 'weekly_limit': 10},
            'Pro': {'daily_tasks': 10, 'bonus': 20, 'weekly_limit': 20},
            'Elite': {'daily_tasks': 20, 'bonus': 25, 'weekly_limit': 40}
        }

        # Actualizar plan
        config = plans_config[plan_name]
        user_plan.plan_name = plan_name
        user_plan.daily_tasks = config['daily_tasks']
        user_plan.bonus_percentage = config['bonus']
        user_plan.weekly_withdrawal_limit = config['weekly_limit']
        user_plan.price = amount
        user_plan.is_active = True
        user_plan.updated_at = timezone.now()

        # Activar cuenta
        user.has_financial_activation = True
        user.is_active = True

        # Boost para planes pagos
        boost_added = 0
        if amount > 0:
            boost_added = amount * 100
            user.purchased_boost += boost_added
            user.boost_balance += boost_added
            Transaction.objects.create(
                user=user,
                transaction_type='deposit',
                usdt_amount=amount,
                boost_amount=boost_added,
                description=f'Activación plan {plan_name}'
            )

        # Fecha de expiración
        if plan_name != 'Free':
            user.plan_expiry_date = timezone.now() + timezone.timedelta(days=30)

        user.save()
        user_plan.save()

        return {
            'message': f'Plan {plan_name} activado exitosamente',
            'user': UserSerializer(user).data,
            'boost_added': float(boost_added)
        }
