from django.contrib.auth import get_user_model
from users.models import Transaction
from django.contrib.auth import authenticate

UserModel = get_user_model()

# Crear usuario y comprobar autenticación
u = UserModel.objects.create_user('testuser_bot','testuser@example.com','pass1234')
print('created', u.username, 'is_active', u.is_active, 'has_financial_activation', u.has_financial_activation)
print('authenticate', bool(authenticate(username='testuser_bot', password='pass1234')))

# Verificar UserPlan creado por señales (si aplica)
try:
    up = u.user_plan
    print('user_plan', up.plan_name, 'is_active', up.is_active)
except Exception as e:
    print('no user_plan', e)

# Crear depósito y verificar activación por depósito
t = Transaction.objects.create(user=u, transaction_type='deposit', usdt_amount=10.00)
print('deposit complete', t.complete_deposit(), 'after deposit has_financial_activation', UserModel.objects.get(pk=u.pk).has_financial_activation)

# Crear nuevo usuario y simular retiro para activar en primer retiro
u2 = UserModel.objects.create_user('testuser_bot2','testuser2@example.com','pass1234')
u2.earned_boost = 200
u2.boost_balance = 200
u2.save()
print('created2', u2.username, 'is_active', u2.is_active, 'has_financial_activation', u2.has_financial_activation)

w = Transaction.objects.create(user=u2, transaction_type='withdrawal', boost_amount=100.00)
print('withdraw complete', w.complete_withdrawal(), 'after withdraw has_financial_activation', UserModel.objects.get(pk=u2.pk).has_financial_activation)
print('balances', UserModel.objects.get(pk=u2.pk).balance, UserModel.objects.get(pk=u2.pk).boost_balance, UserModel.objects.get(pk=u2.pk).earned_boost)
