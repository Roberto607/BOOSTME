from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Task, TaskCompletion
from .serializers import TaskSerializer, TaskCompletionSerializer
from users.models import UserPlan
import random
from django.utils import timezone
from django.conf import settings
import os
import json
from urllib import parse
import urllib.request as urllib_request

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    queryset = Task.objects.all()

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user, status='pending')

    def get_adgate_tasks(self, plan_name):
        """Obtener tareas de AdGate según el plan del usuario."""
        plan_tasks = {
            'Free': {
                'daily_limit': 10,
                'categories': ['videos', 'social', 'surveys'],
                'reward_range': [0.10, 1.00]
            },
            'Starter': {
                'daily_limit': 15,
                'categories': ['videos', 'social', 'surveys', 'app_installs'],
                'reward_range': [0.10, 2.00]
            },
            'Pro': {
                'daily_limit': 20,
                'categories': ['videos', 'social', 'surveys', 'app_installs', 'sign_up'],
                'reward_range': [0.10, 5.00]
            },
            'Elite': {
                'daily_limit': -1,  # ilimitadas
                'categories': ['all'],
                'reward_range': [0.10, 20.00]
            }
        }

        current_plan = plan_tasks.get(plan_name, plan_tasks['Free'])
        
        # Contenido de ejemplo para cada tipo de tarea
        adgate_offers = {
            'videos': [
                {
                    'id': 1,
                    'type': 'video',
                    'category': 'videos',
                    'title': 'Ver video publicitario',
                    'description': 'Ver video de 30 segundos',
                    'reward': random.uniform(*current_plan['reward_range']),
                    'url': 'https://adgatemedia.com/videos/123',
                    'platform': 'AdGate Media'
                }
            ],
            'social': [
                {
                    'id': 2,
                    'type': 'social',
                    'category': 'social',
                    'title': 'Seguir en Instagram',
                    'description': 'Seguir cuenta de Instagram',
                    'reward': random.uniform(*current_plan['reward_range']),
                    'url': 'https://adgatemedia.com/social/456',
                    'platform': 'AdGate Media'
                }
            ],
            'surveys': [
                {
                    'id': 3,
                    'type': 'survey',
                    'category': 'surveys',
                    'title': 'Encuesta de opinión',
                    'description': 'Completar encuesta de 5 minutos',
                    'reward': random.uniform(*current_plan['reward_range']),
                    'url': 'https://adgatemedia.com/surveys/789',
                    'platform': 'AdGate Media'
                }
            ],
            'app_installs': [
                {
                    'id': 4,
                    'type': 'app_install',
                    'category': 'app_installs',
                    'title': 'Instalar juego',
                    'description': 'Instalar y jugar 5 minutos',
                    'reward': random.uniform(*current_plan['reward_range']),
                    'url': 'https://adgatemedia.com/apps/101',
                    'platform': 'AdGate Media'
                }
            ],
            'sign_up': [
                {
                    'id': 5,
                    'type': 'sign_up',
                    'category': 'sign_up',
                    'title': 'Registro gratuito',
                    'description': 'Crear cuenta en servicio',
                    'reward': random.uniform(*current_plan['reward_range']),
                    'url': 'https://adgatemedia.com/signup/202',
                    'platform': 'AdGate Media'
                }
            ]
        }

        # Filtrar según el plan del usuario
        available_offers = []
        for category in current_plan['categories']:
            if category == 'all':
                available_offers.extend([offer for offers in adgate_offers.values() for offer in offers])
            else:
                available_offers.extend(adgate_offers.get(category, []))

        # Limitar según el plan
        if current_plan['daily_limit'] != -1:
            available_offers = available_offers[:current_plan['daily_limit']]

        return available_offers

    def get_external_offers(self, plan_name):
        """Devuelve ofertas externas estructuradas para mostrar en el frontend."""
        plan_tasks = {
            'Free': {'reward_range': [0.10, 1.00]},
            'Starter': {'reward_range': [0.10, 2.00]},
            'Pro': {'reward_range': [0.10, 5.00]},
            'Elite': {'reward_range': [0.10, 20.00]}
        }
        current_plan = plan_tasks.get(plan_name, plan_tasks['Free'])
        reward = round(random.uniform(*current_plan['reward_range']), 2)

        return [
            {
                'id': 'monlix-app-setup',
                'provider': 'Monlix',
                'title': 'Configura tu app o sitio para monetización',
                'description': 'Registra una app o un enlace público para empezar a conectar ofertas de monetización.',
                'reward': reward,
                'url': 'https://publisher.monlix.com/apps/new',
                'category': 'app_monetization',
                'payout_type': 'Revisa panel',
                'requires_deployment': True,
                'platform': 'Monlix'
            },
            {
                'id': 'adgate-demo-offer',
                'provider': 'AdGate Media',
                'title': 'Oferta demo de anuncios',
                'description': 'Integra un anuncio o campaña publicitaria para probar el flujo.',
                'reward': round(reward + 0.20, 2),
                'url': 'https://adgatemedia.com/videos/123',
                'category': 'videos',
                'payout_type': 'Revisa panel',
                'requires_deployment': False,
                'platform': 'AdGate Media'
            }
        ]

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Marca una tarea como completada."""
        try:
            task = self.get_object()
            watched_seconds = None
            if task.task_type == 'video':
                watched_seconds = request.data.get('watched_seconds')
                required_duration = None
                if isinstance(task.content_data, dict):
                    required_duration = task.content_data.get('duration')
                if required_duration is None:
                    required_duration = 30

                if watched_seconds is None:
                    return Response(
                        {'error': 'Se requiere el tiempo de visualización para completar la tarea de video.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                try:
                    watched_seconds = int(watched_seconds)
                except (TypeError, ValueError):
                    return Response(
                        {'error': 'El tiempo de visualización debe ser un número.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if watched_seconds < required_duration:
                    return Response(
                        {'error': f'Necesitas ver el video al menos {required_duration} segundos para completar la tarea.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif task.task_type in ['referral', 'social']:
                required_referrals = 5
                if isinstance(task.content_data, dict):
                    required_referrals = task.content_data.get('required_referrals', required_referrals)

                referral_system = getattr(request.user, 'referral_system', None)
                current_referrals = getattr(referral_system, 'referral_count', 0) if referral_system else 0
                if current_referrals < required_referrals:
                    return Response(
                        {
                            'error': (
                                f'Necesitas al menos {required_referrals} referidos para completar esta tarea. '
                                f'Tienes {current_referrals}.'
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if task.complete_task(watched_seconds=watched_seconds):
                return Response({'message': 'Tarea completada exitosamente'})
            return Response(
                {'error': 'No se pudo completar la tarea'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def daily_tasks(self, request):
        """Obtener o generar las tareas diarias del usuario."""
        try:
            # Verificar autenticación
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Usuario no autenticado'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Obtener o crear el plan del usuario
            user_plan, created = UserPlan.objects.get_or_create(
                user=request.user,
                defaults={
                    'plan_name': 'Free',
                    'is_active': True,
                    'daily_tasks': 10,
                    'bonus_percentage': 0,
                    'weekly_withdrawal_limit': 5
                }
            )
            
            # Verificar si hay tareas expiradas y eliminarlas
            Task.objects.filter(
                user=request.user,
                expires_at__lt=timezone.now()
            ).delete()

            # Eliminar la tarea de dashboard si el usuario está en el plan Free
            if user_plan.plan_name == 'Free':
                Task.objects.filter(
                    user=request.user,
                    status='pending',
                    task_type='dashboard'
                ).delete()

            pending_tasks = request.user.tasks.filter(status='pending')
            required_task_types = ['profile', 'referral', 'survey', 'review', 'video']
            missing_required_task = any(
                not pending_tasks.filter(task_type=task_type).exists()
                for task_type in required_task_types
            )
            should_generate_free_tasks = (
                user_plan.plan_name == 'Free' and (
                    created or
                    not pending_tasks.exists() or
                    pending_tasks.count() < 4 or
                    missing_required_task
                )
            )
            # Allow disabling automatic task generation via env var
            if os.getenv('DISABLE_AUTO_TASKS', '0').lower() in ('1', 'true', 'yes'):
                should_generate_free_tasks = False
            
            # Si es nuevo o faltan tareas importantes, generarlas
            if should_generate_free_tasks:
                self.generate_free_tasks(request.user)
            
            # Obtener las tareas
            tasks = self.get_queryset()
            serializer = self.get_serializer(tasks, many=True)
            
            return Response({
                'tasks': serializer.data,
                'plan_info': {
                    'name': user_plan.plan_name,
                    'daily_tasks': user_plan.daily_tasks,
                    'bonus_percentage': user_plan.bonus_percentage,
                    'weekly_withdrawal_limit': user_plan.weekly_withdrawal_limit
                }
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def parse_iso8601_duration(self, duration):
        """Convierte una duración ISO 8601 a segundos."""
        if not duration or not duration.startswith('PT'):
            return 0

        hours = minutes = seconds = 0
        current_number = ''

        for char in duration[2:]:
            if char.isdigit():
                current_number += char
            else:
                if char == 'H':
                    hours = int(current_number or 0)
                elif char == 'M':
                    minutes = int(current_number or 0)
                elif char == 'S':
                    seconds = int(current_number or 0)
                current_number = ''

        return hours * 3600 + minutes * 60 + seconds

    def get_youtube_video_task(self, user, query='BoostMe tutorial'):
        """Busca un video en YouTube y devuelve los datos para crear una tarea de video."""
        api_key = getattr(settings, 'YOUTUBE_API_KEY', None)
        if not api_key:
            return None

        used_video_ids = set(
            task.content_data.get('video_id')
            for task in Task.objects.filter(user=user, task_type='video')
            if task.content_data and isinstance(task.content_data, dict) and task.content_data.get('video_id')
        )

        try:
            search_terms = [
                query,
                'motivational short',
                'productivity tips video',
                'quick learn clip',
                'creative habit video'
            ]
            selected_query = random.choice(search_terms)
            search_query = parse.quote(selected_query)
            search_url = (
                f"https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10"
                f"&q={search_query}&key={api_key}"
            )
            with urllib_request.urlopen(search_url, timeout=10) as response:
                data = json.load(response)

            items = data.get('items') or []
            if not items:
                return None

            random.shuffle(items)
            for video_item in items:
                video_id = video_item.get('id', {}).get('videoId')
                snippet = video_item.get('snippet', {})
                title = snippet.get('title', 'Video recomendado')
                description = snippet.get('description', '')

                if not video_id or video_id in used_video_ids:
                    continue

                details_url = (
                    f"https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id={video_id}&key={api_key}"
                )
                with urllib_request.urlopen(details_url, timeout=10) as response:
                    details_data = json.load(response)

                detail_items = details_data.get('items') or []
                if not detail_items:
                    continue

                detail = detail_items[0]
                content_details = detail.get('contentDetails', {})
                duration_seconds = self.parse_iso8601_duration(content_details.get('duration'))
                if not duration_seconds:
                    continue

                required_seconds = min(duration_seconds, 45)
                return {
                    'task_type': 'video',
                    'description': 'Disfruta de un contenido breve e inspirador para avanzar en BoostMe.',
                    'boost_reward': 4.00,
                    'content_type': 'video',
                    'content_url': f'https://www.youtube.com/watch?v={video_id}',
                    'content_data': {
                        'duration': required_seconds,
                        'original_duration': duration_seconds,
                        'platform': 'YouTube',
                        'video_id': video_id,
                        'title': title,
                        'description': description
                    },
                    'action_type': 'watch',
                    'action_url': f'https://www.youtube.com/watch?v={video_id}',
                    'simulated_action': 'video',
                    'simulated_content': title
                }

            return None
        except Exception:
            return None

    @action(detail=False, methods=['post'])
    def generate_daily(self, request):
        """Generar nuevas tareas diarias."""
        try:
            user_plan = UserPlan.objects.get(user=request.user)
            if user_plan.is_active:
                self.generate_free_tasks(request.user)
                return Response({'message': 'Tareas diarias generadas'})
            return Response(
                {'error': 'No tienes un plan activo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def adgate_tasks(self, request):
        """Obtener tareas de AdGate Media según el plan del usuario."""
        try:
            user_plan = UserPlan.objects.get(user=request.user)
            
            # Obtener tareas de AdGate según el plan
            adgate_tasks = self.get_adgate_tasks(user_plan.plan_name)
            
            offers = self.get_external_offers(user_plan.plan_name)

            return Response({
                'tasks': adgate_tasks,
                'offers': offers,
                'plan_info': {
                    'name': user_plan.plan_name,
                    'daily_limit': self.get_adgate_tasks(user_plan.plan_name).__len__() if user_plan.plan_name != 'Elite' else 'Ilimitadas',
                    'categories': self.get_adgate_tasks(user_plan.plan_name)[0]['category'] if adgate_tasks else []
                }
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def generate_free_tasks(self, user):
        """Genera tareas de onboarding y demo para el plan Free.

        Agrega solo las tareas que falten para el usuario, preservando las tareas pendientes existentes.
        Esto permite crear un nuevo video si el usuario ya completó el anterior.
        """
        try:
            pending_types = set(user.tasks.filter(status='pending').values_list('task_type', flat=True))

            video_task = self.get_youtube_video_task(user, query='BoostMe tutorial') or {
                'task_type': 'video',
                'description': 'Sumérgete en un contenido breve y motivador para avanzar en BoostMe.',
                'boost_reward': 4.00,
                'content_type': 'video',
                'content_url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'content_data': {'duration': 30, 'video_id': 'dQw4w9WgXcQ'},
                'simulated_action': 'video',
                'simulated_content': 'Inspírate con este video de bienvenida.'
            }

            free_tasks = [
                {
                    'task_type': 'profile',
                    'description': 'Completa tu perfil para activar tu cuenta en BoostMe.',
                    'boost_reward': 3.00,
                    'content_type': 'profile',
                    'content_url': 'https://boostme.test/profile',
                    'simulated_action': 'profile',
                    'simulated_content': 'Completa tu perfil y prepara tu primer progreso.'
                },
                {
                    'task_type': 'referral',
                    'description': 'Invita a 5 personas con tu enlace de referidos y gana 8 Boost cuando lo completes.',
                    'boost_reward': 8.00,
                    'content_type': 'text',
                    'content_url': None,
                    'content_data': {'required_referrals': 5},
                    'simulated_action': 'referral',
                    'simulated_content': 'Comparte tu enlace de referido con tus amigos y gana Boost.'
                },
                video_task,
                {
                    'task_type': 'survey',
                    'description': 'Completa una encuesta breve de intereses para desbloquear más contenido.',
                    'boost_reward': 6.00,
                    'content_type': 'text',
                    'content_url': None,
                    'simulated_action': 'survey',
                    'simulated_content': 'Encuesta de preferencias.'
                },
                {
                    'task_type': 'review',
                    'description': 'Activa tu primer objetivo y marca tu primera meta.',
                    'boost_reward': 8.00,
                    'content_type': 'text',
                    'content_url': None,
                    'simulated_action': 'goal',
                    'simulated_content': 'Activa un objetivo para empezar a acumular Boost.'
                }
            ]

            for task_data in free_tasks:
                if task_data['task_type'] in pending_types:
                    continue
                Task.objects.create(
                    user=user,
                    task_type=task_data['task_type'],
                    boost_reward=task_data['boost_reward'],
                    description=task_data['description'],
                    content_type=task_data.get('content_type'),
                    content_url=task_data.get('content_url'),
                    content_data=task_data.get('content_data', {}),
                    simulated_action=task_data.get('simulated_action', ''),
                    simulated_content=task_data.get('simulated_content', ''),
                    expires_at=timezone.now() + timezone.timedelta(hours=24)
                )
        except Exception as e:
            raise e

class TaskCompletionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para ver el historial de tareas completadas.
    Solo permite operaciones de lectura (GET).
    """
    serializer_class = TaskCompletionSerializer
    permission_classes = [IsAuthenticated]
    queryset = TaskCompletion.objects.all()

    def get_queryset(self):
        return TaskCompletion.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def streak_info(self, request):
        """Obtener información sobre la racha actual del usuario."""
        try:
            latest_completion = self.get_queryset().order_by('-completed_at').first()
            if latest_completion:
                return Response({
                    'current_streak': latest_completion.streak_count,
                    'last_completion': latest_completion.completed_at
                })
            return Response({
                'current_streak': 0,
                'last_completion': None
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
