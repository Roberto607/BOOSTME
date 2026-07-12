from django.contrib.auth import get_user_model
import sys, traceback

User = get_user_model()
u = User.objects.first()
print('USER:', repr(u))
if u is None:
    print('NO_USER_FOUND')
    sys.exit(0)

from users.models import UserPlan

up, created = UserPlan.objects.get_or_create(user=u, defaults={'plan_name': 'Pro', 'is_active': True})
print('USERPLAN_CREATED', created, up.pk)

try:
    up.activate_plan()
    print('ACTIVATE_PLAN_OK')
except Exception as e:
    print('ACTIVATE_PLAN_EXCEPTION:', e)
    traceback.print_exc()
    raise
