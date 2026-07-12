from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from users.models import UserPlan
from tasks.models import Task
from django.utils import timezone

User = get_user_model()


class TaskFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='freeflowuser',
            email='freeflow@example.com',
            password='testpass123'
        )
        UserPlan.objects.get_or_create(
            user=self.user,
            defaults={
                'plan_name': 'Free',
                'is_active': True,
                'daily_tasks': 6,
                'bonus_percentage': 0,
                'weekly_withdrawal_limit': 5
            }
        )
        self.client.force_authenticate(self.user)

    def test_free_plan_daily_tasks_include_profile_and_referral_actions(self):
        response = self.client.get('/api/tasks/tasks/daily_tasks/')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        tasks = payload['tasks']

        self.assertGreaterEqual(len(tasks), 4)
        descriptions = [task['description'].lower() for task in tasks]
        task_types = [task['task_type'] for task in tasks]
        self.assertTrue(any('perfil' in description for description in descriptions))
        self.assertTrue(any('referido' in description or 'referir' in description for description in descriptions))
        self.assertTrue(any('objetivo' in description or 'panel' in description or 'tablero' in description or 'notificaciones' in description for description in descriptions))
        self.assertIn('dashboard', task_types)
        self.assertIn('video', task_types)


    def test_profile_task_is_completed_and_rewards_boost_when_profile_is_updated(self):
        task = Task.objects.create(
            user=self.user,
            task_type='profile',
            boost_reward=3.00,
            description='Completa tu perfil para activar tu cuenta en BoostMe.',
            status='pending',
            expires_at=timezone.now() + timezone.timedelta(hours=24)
        )

        response = self.client.patch('/api/users/profile/', {
            'username': 'freeflowuser',
            'email': 'freeflow@example.com',
            'bio': 'Perfil actualizado'
        }, format='json')

        self.assertEqual(response.status_code, 200)
        task.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(task.status, 'completed')
        self.assertEqual(float(self.user.boost_balance), 3.00)
        self.assertEqual(float(self.user.earned_boost), 3.00)


class TaskExternalOffersTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='provideruser',
            email='provider@example.com',
            password='testpass123'
        )
        UserPlan.objects.get_or_create(
            user=self.user,
            defaults={
                'plan_name': 'Starter',
                'is_active': True,
                'daily_tasks': 15,
                'bonus_percentage': 10,
                'weekly_withdrawal_limit': 10
            }
        )
        self.client.force_authenticate(self.user)

    def test_external_offers_endpoint_returns_provider_offers(self):
        response = self.client.get('/api/tasks/tasks/adgate_tasks/')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn('offers', payload)
        self.assertTrue(payload['offers'])
        providers = [offer['provider'] for offer in payload['offers']]
        self.assertIn('Monlix', providers)
