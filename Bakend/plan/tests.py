from django.test import TestCase
from .models import PlanDefinition


class PlanDefinitionTests(TestCase):
    def test_plan_definition_can_be_created_with_admin_like_fields(self):
        plan = PlanDefinition.objects.create(
            name='Starter',
            slug='starter',
            price=50,
            is_free=False,
            recommended=True,
            description='Plan de crecimiento',
            features=['Más tareas', 'Bonos mejorados'],
            daily_tasks=15,
            bonus_percentage=10,
            weekly_withdrawal_limit=10,
            min_referrals=5,
            commission_percentage=10,
            is_active=True,
        )

        self.assertEqual(plan.name, 'Starter')
        self.assertEqual(plan.daily_tasks, 15)
        self.assertTrue(plan.recommended)
