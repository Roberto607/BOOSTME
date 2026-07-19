from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from users.models import UserPlan
from tasks.models import Task
from tasks.views import TaskViewSet
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

        self.assertGreaterEqual(len(tasks), 3)
        descriptions = [task['description'].lower() for task in tasks]
        task_types = [task['task_type'] for task in tasks]
        self.assertTrue(any('objetivo' in description or 'panel' in description or 'tablero' in description or 'notificaciones' in description for description in descriptions))
        self.assertIn('dashboard', task_types)
        self.assertTrue(any(task_type in ['video', 'survey', 'referral', 'review'] for task_type in task_types))


    def test_profile_task_is_not_generated_when_profile_is_already_complete(self):
        self.user.bio = 'Perfil ya completo'
        self.user.country = 'Mexico'
        self.user.save()

        response = self.client.get('/api/tasks/tasks/daily_tasks/')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        task_types = [task['task_type'] for task in payload['tasks']]
        self.assertNotIn('profile', task_types)

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

    def test_video_completion_schedules_a_new_video_after_three_minutes(self):
        task = Task.objects.create(
            user=self.user,
            task_type='video',
            boost_reward=4.00,
            description='Ver un video breve.',
            status='pending',
            content_data={'duration': 30, 'video_id': 'abc123'},
            expires_at=timezone.now() + timezone.timedelta(hours=24)
        )

        response = self.client.post(
            f'/api/tasks/tasks/{task.id}/complete/',
            {'watched_seconds': 30},
            format='json'
        )

        self.assertEqual(response.status_code, 200)
        pending_videos = Task.objects.filter(user=self.user, task_type='video', status='pending').exclude(id=task.id)
        self.assertGreaterEqual(pending_videos.count(), 1)
        next_video = pending_videos.first()
        self.assertIn('available_at', next_video.content_data)
        self.assertGreater(next_video.content_data['available_at'], timezone.now().isoformat())

    def test_survey_responses_store_user_preferences_for_future_tasks(self):
        task = Task.objects.create(
            user=self.user,
            task_type='survey',
            boost_reward=6.00,
            description='Completa una encuesta breve para mejorar BoostMe.',
            status='pending',
            content_data={
                'survey_title': 'Preferencias de usuario',
                'questions': [
                    {'id': 'q1', 'question': '¿Qué te interesa más?', 'type': 'single_choice', 'options': ['Videos', 'Recompensas', 'Referidos']}
                ]
            },
            expires_at=timezone.now() + timezone.timedelta(hours=24)
        )

        response = self.client.post(
            f'/api/tasks/tasks/{task.id}/complete/',
            {'survey_responses': {'q1': 'Videos'}},
            format='json'
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertIn('preferred_task_types', self.user.task_preferences)
        self.assertIn('video', self.user.task_preferences['preferred_task_types'])

    def test_platform_surveys_are_limited_to_ten_unique_templates(self):
        viewset = TaskViewSet()
        seen_titles = []
        for _ in range(12):
            survey = viewset.get_platform_survey_task(self.user)
            if survey:
                title = survey['content_data']['survey_title']
                seen_titles.append(title)
                Task.objects.create(
                    user=self.user,
                    task_type='survey',
                    boost_reward=6.00,
                    description='Encuesta de prueba',
                    content_type='survey',
                    content_data={'survey_title': title},
                    status='completed',
                    expires_at=timezone.now() + timezone.timedelta(hours=24)
                )

        self.assertEqual(len(set(seen_titles)), 10)

    def test_survey_completion_schedules_a_new_survey_after_cooldown_even_when_templates_are_exhausted(self):
        for title in ['Encuesta interna de BoostMe', 'Encuesta de satisfacción BoostMe', 'Encuesta de feedback BoostMe']:
            Task.objects.create(
                user=self.user,
                task_type='survey',
                boost_reward=6.00,
                description='Encuesta completa',
                status='completed',
                content_data={'survey_title': title},
                expires_at=timezone.now() + timezone.timedelta(hours=24)
            )

        task = Task.objects.create(
            user=self.user,
            task_type='survey',
            boost_reward=6.00,
            description='Encuesta de prueba',
            status='pending',
            content_data={'survey_title': 'Preferencias de usuario'},
            expires_at=timezone.now() + timezone.timedelta(hours=24)
        )

        response = self.client.post(
            f'/api/tasks/tasks/{task.id}/complete/',
            {'survey_responses': {'q1': 'Videos'}},
            format='json'
        )

        self.assertEqual(response.status_code, 200)
        pending_surveys = Task.objects.filter(user=self.user, task_type='survey', status='pending')
        self.assertGreaterEqual(pending_surveys.count(), 1)
        next_survey = pending_surveys.exclude(id=task.id).first()
        self.assertIsNotNone(next_survey)
        self.assertIn('available_at', next_survey.content_data)


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
