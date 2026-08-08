from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Task, TaskCompletion
from .serializers import TaskSerializer, TaskCompletionSerializer
from users.models import UserPlan
from plan.models import PlanDefinition
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
                if task.task_type == 'video' and isinstance(request.data, dict):
                    cooldown_minutes = 3
                    video_task = self.get_youtube_video_task(request.user, query='BoostMe tutorial') or {
                        'task_type': 'video',
                        'description': 'Tu siguiente video ya está listo; vuelve cuando termine el tiempo de espera.',
                        'boost_reward': 4.00,
                        'content_type': 'video',
                        'content_url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        'content_data': {
                            'duration': 30,
                            'video_id': 'dQw4w9WgXcQ',
                            'available_at': (timezone.now() + timezone.timedelta(minutes=cooldown_minutes)).isoformat()
                        },
                        'action_type': 'watch',
                        'action_url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        'simulated_action': 'video',
                        'simulated_content': 'Video de seguimiento.'
                    }
                    scheduled_at = timezone.now() + timezone.timedelta(minutes=cooldown_minutes)
                    content_data = dict(video_task.get('content_data', {}) or {})
                    content_data['available_at'] = scheduled_at.isoformat()
                    Task.objects.create(
                        user=request.user,
                        task_type='video',
                        boost_reward=video_task['boost_reward'],
                        description=video_task['description'],
                        content_type=video_task.get('content_type'),
                        content_url=video_task.get('content_url'),
                        content_data=content_data,
                        action_type=video_task.get('action_type', video_task.get('simulated_action', 'video')),
                        action_url=video_task.get('action_url', video_task.get('content_url')),
                        simulated_action=video_task.get('simulated_action', ''),
                        simulated_content=video_task.get('simulated_content', ''),
                        expires_at=scheduled_at + timezone.timedelta(hours=24)
                    )

                if task.task_type == 'survey' and isinstance(request.data, dict):
                    survey_responses = request.data.get('survey_responses') or {}
                    if survey_responses:
                        preferred_task_types = []
                        response_values = [str(value).strip().lower() for value in survey_responses.values() if value]
                        for value in response_values:
                            if 'video' in value:
                                preferred_task_types.append('video')
                            if 'recompensa' in value or 'reward' in value:
                                preferred_task_types.append('reward')
                            if 'referid' in value:
                                preferred_task_types.append('referral')
                            if 'objetivo' in value or 'meta' in value or 'progreso' in value:
                                preferred_task_types.append('goal')
                            if 'encuesta' in value or 'preferencia' in value or 'feedback' in value:
                                preferred_task_types.append('survey')
                        if preferred_task_types:
                            request.user.task_preferences = {
                                'preferred_task_types': list(dict.fromkeys(preferred_task_types))
                            }
                            request.user.save(update_fields=['task_preferences'])

                    cooldown_minutes = 5
                    survey_task = self.get_platform_survey_task(request.user) or {
                        'task_type': 'survey',
                        'description': 'Tu siguiente encuesta ya está lista; responde cuando llegue el momento programado.',
                        'boost_reward': 6.00,
                        'content_type': 'survey',
                        'content_url': None,
                        'content_data': {
                            'survey_title': 'Encuesta de seguimiento BoostMe',
                            'questions': [
                                {
                                    'id': 'q1',
                                    'question': '¿Qué te gustaría ver a continuación en BoostMe?',
                                    'type': 'single_choice',
                                    'options': ['Más videos', 'Más recompensas', 'Más referidos', 'Más metas']
                                },
                                {
                                    'id': 'q2',
                                    'question': '¿Qué te parece el ritmo actual de tareas?',
                                    'type': 'single_choice',
                                    'options': ['Muy bien', 'Bien', 'Regular', 'Mejorable']
                                },
                                {
                                    'id': 'q3',
                                    'question': '¿Tienes alguna sugerencia adicional?',
                                    'type': 'text',
                                    'options': []
                                }
                            ]
                        },
                        'action_type': 'survey',
                        'action_url': None,
                        'simulated_action': 'survey',
                        'simulated_content': 'Encuesta de seguimiento.'
                    }
                    scheduled_at = timezone.now() + timezone.timedelta(minutes=cooldown_minutes)
                    content_data = dict(survey_task.get('content_data', {}) or {})
                    content_data['available_at'] = scheduled_at.isoformat()
                    Task.objects.create(
                        user=request.user,
                        task_type='survey',
                        boost_reward=survey_task['boost_reward'],
                        description=survey_task['description'],
                        content_type=survey_task.get('content_type'),
                        content_url=survey_task.get('content_url'),
                        content_data=content_data,
                        action_type=survey_task.get('action_type', survey_task.get('simulated_action', 'survey')),
                        action_url=survey_task.get('action_url', survey_task.get('content_url')),
                        simulated_action=survey_task.get('simulated_action', ''),
                        simulated_content=survey_task.get('simulated_content', ''),
                        expires_at=scheduled_at + timezone.timedelta(hours=24)
                    )

                if hasattr(request.user, 'plan_name') and request.user.plan_name == 'Free':
                    pending_count = request.user.tasks.filter(status='pending').count()
                    if pending_count < 2:
                        self.generate_free_tasks(request.user)
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

            if self.user_profile_is_complete(request.user):
                Task.objects.filter(
                    user=request.user,
                    status='pending',
                    task_type='profile'
                ).delete()

            pending_tasks = request.user.tasks.filter(status='pending')
            pending_survey_exists = pending_tasks.filter(task_type='survey').exists()
            pending_task_count = pending_tasks.count()

            # Usamos encuestas internas definidas por la plataforma en lugar de enlaces externos.
            should_generate_free_tasks = (
                user_plan.plan_name == 'Free' and (
                    created or
                    pending_task_count == 0 or
                    not pending_survey_exists or
                    pending_task_count < min(3, user_plan.daily_tasks)
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

            plan_features = []
            plan_task_types = []
            plan_definition = PlanDefinition.objects.filter(name=user_plan.plan_name, is_active=True).first()
            if plan_definition:
                raw_features = plan_definition.features or ''
                if isinstance(raw_features, str):
                    plan_features = [line.strip() for line in raw_features.splitlines() if line.strip()]
                elif isinstance(raw_features, (list, tuple)):
                    plan_features = [str(item).strip() for item in raw_features if str(item).strip()]

                raw_task_types = plan_definition.task_types or ''
                if isinstance(raw_task_types, str):
                    plan_task_types = [line.strip() for line in raw_task_types.splitlines() if line.strip()]
                elif isinstance(raw_task_types, (list, tuple)):
                    plan_task_types = [str(item).strip() for item in raw_task_types if str(item).strip()]

            return Response({
                'tasks': serializer.data,
                'plan_info': {
                    'name': user_plan.plan_name,
                    'daily_tasks': user_plan.daily_tasks,
                    'bonus_percentage': user_plan.bonus_percentage,
                    'weekly_withdrawal_limit': user_plan.weekly_withdrawal_limit,
                    'features': plan_features,
                    'task_types': plan_task_types
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

            plan_task_types = []
            plan_definition = PlanDefinition.objects.filter(name=user_plan.plan_name, is_active=True).first()
            if plan_definition:
                raw_task_types = plan_definition.task_types or ''
                if isinstance(raw_task_types, str):
                    plan_task_types = [line.strip() for line in raw_task_types.splitlines() if line.strip()]
                elif isinstance(raw_task_types, (list, tuple)):
                    plan_task_types = [str(item).strip() for item in raw_task_types if str(item).strip()]

            return Response({
                'tasks': adgate_tasks,
                'offers': offers,
                'plan_info': {
                    'name': user_plan.plan_name,
                    'daily_limit': self.get_adgate_tasks(user_plan.plan_name).__len__() if user_plan.plan_name != 'Elite' else 'Ilimitadas',
                    'categories': self.get_adgate_tasks(user_plan.plan_name)[0]['category'] if adgate_tasks else [],
                    'task_types': plan_task_types
                }
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def user_profile_is_complete(self, user):
        """Determina si el usuario ya tiene información útil en su perfil."""
        profile_fields = [
            getattr(user, 'bio', None),
            getattr(user, 'country', None),
            getattr(user, 'city', None),
            getattr(user, 'phone', None),
            getattr(user, 'photo', None),
        ]
        for field in profile_fields:
            if field is None:
                continue
            if isinstance(field, str):
                if field.strip():
                    return True
            elif hasattr(field, 'name'):
                if getattr(field, 'name', None):
                    return True
            elif field:
                return True
        return False

    def generate_free_tasks(self, user):
        """Genera tareas de onboarding y demo para el plan Free.

        Agrega solo las tareas que falten para el usuario, preservando las tareas pendientes existentes.
        Esto permite crear un nuevo video si el usuario ya completó el anterior.
        """
        try:
            pending_types = set(user.tasks.filter(status='pending').values_list('task_type', flat=True))
            used_types = set(user.tasks.filter(status__in=['completed', 'expired']).values_list('task_type', flat=True))
            preferences = getattr(user, 'task_preferences', {}) or {}
            preferred_task_types = set(preferences.get('preferred_task_types', []))

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

            survey_task = self.get_platform_survey_task(user) or {
                'task_type': 'survey',
                'description': 'Completa una encuesta breve de intereses para desbloquear más contenido.',
                'boost_reward': 6.00,
                'content_type': 'survey',
                'content_url': None,
                'content_data': {
                    'survey_title': 'Encuesta rápida de la plataforma',
                    'questions': [
                        {
                            'id': 'q1',
                            'question': '¿Con qué frecuencia usas BoostMe?',
                            'type': 'single_choice',
                            'options': ['Todos los días', 'Varias veces a la semana', 'Una vez a la semana', 'Menos de una vez a la semana']
                        },
                        {
                            'id': 'q2',
                            'question': '¿Qué característica te gusta más?',
                            'type': 'single_choice',
                            'options': ['Tareas', 'Recompensas', 'Progreso', 'Referidos']
                        },
                        {
                            'id': 'q3',
                            'question': '¿Qué mejorarías en BoostMe?',
                            'type': 'text',
                            'options': []
                        }
                    ]
                },
                'action_type': 'survey',
                'action_url': None,
                'simulated_action': 'survey',
                'simulated_content': 'Encuesta de preferencias.'
            }

            plan_definition = PlanDefinition.objects.filter(name=user_plan.plan_name, is_active=True).first()
            allowed_task_types = None
            if plan_definition and plan_definition.task_types:
                allowed_task_types = [line.strip() for line in str(plan_definition.task_types).splitlines() if line.strip()]

            base_tasks = []
            if not self.user_profile_is_complete(user) and (allowed_task_types is None or 'profile' in allowed_task_types):
                base_tasks.append({
                    'task_type': 'profile',
                    'description': 'Completa tu perfil para activar tu cuenta en BoostMe.',
                    'boost_reward': 3.00,
                    'content_type': 'profile',
                    'content_url': 'https://boostme.test/profile',
                    'simulated_action': 'profile',
                    'simulated_content': 'Completa tu perfil y prepara tu primer progreso.'
                })

            candidate_tasks = [
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
                survey_task,
                {
                    'task_type': 'dashboard',
                    'description': 'Explora tu panel para ver tu progreso y activar tu siguiente meta.',
                    'boost_reward': 4.00,
                    'content_type': 'text',
                    'content_url': None,
                    'simulated_action': 'dashboard',
                    'simulated_content': 'Explora tu panel para ver tus avances.'
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

            for task in candidate_tasks:
                if allowed_task_types is None or task['task_type'] in allowed_task_types:
                    base_tasks.append(task)

            free_tasks = []
            for task in base_tasks:
                if task['task_type'] in used_types:
                    continue
                free_tasks.append(task)

            if preferred_task_types:
                preferred_order = []
                if 'video' in preferred_task_types:
                    preferred_order.append(video_task)
                if 'survey' in preferred_task_types:
                    preferred_order.append(survey_task)
                if 'referral' in preferred_task_types:
                    preferred_order.append(next(task for task in free_tasks if task['task_type'] == 'referral'))
                if 'goal' in preferred_task_types:
                    preferred_order.append(next(task for task in free_tasks if task['task_type'] == 'review'))

                if preferred_order:
                    free_tasks = [task for task in preferred_order if task] + [task for task in free_tasks if task not in preferred_order]

            if survey_task is None:
                free_tasks = [task for task in free_tasks if task['task_type'] != 'survey']

            created_tasks = []
            for task_data in free_tasks:
                if task_data['task_type'] in pending_types or task_data['task_type'] in used_types:
                    continue
                task = Task.objects.create(
                    user=user,
                    task_type=task_data['task_type'],
                    boost_reward=task_data['boost_reward'],
                    description=task_data['description'],
                    content_type=task_data.get('content_type'),
                    content_url=task_data.get('content_url'),
                    content_data=task_data.get('content_data', {}),
                    action_type=task_data.get('action_type', task_data.get('simulated_action', 'survey')),
                    action_url=task_data.get('action_url', task_data.get('content_url')),
                    simulated_action=task_data.get('simulated_action', ''),
                    simulated_content=task_data.get('simulated_content', ''),
                    expires_at=timezone.now() + timezone.timedelta(hours=24)
                )
                created_tasks.append(task)

            if len(created_tasks) < 10:
                for task_type in ['profile', 'referral', 'video', 'survey', 'dashboard', 'review']:
                    if task_type == 'profile' and self.user_profile_is_complete(user):
                        continue
                    if task_type in used_types or task_type in pending_types:
                        continue
                    if any(existing.task_type == task_type for existing in created_tasks):
                        continue
                    fallback_task = Task.objects.create(
                        user=user,
                        task_type=task_type,
                        boost_reward=4.00 if task_type == 'dashboard' else 6.00 if task_type == 'survey' else 3.00 if task_type == 'profile' else 8.00 if task_type == 'review' else 4.00,
                        description='Tarea de rotación gratuita para mantener el feed activo.',
                        content_type='text',
                        content_url=None,
                        content_data={},
                        action_type=task_type,
                        action_url=None,
                        simulated_action=task_type,
                        simulated_content='Tarea de rotación gratuita.',
                        expires_at=timezone.now() + timezone.timedelta(hours=24)
                    )
                    created_tasks.append(fallback_task)
                    if len(created_tasks) >= 10:
                        break
        except Exception as e:
            raise e

    def get_platform_survey_task(self, user):
        """Crear una tarea interna de encuesta definida por la plataforma."""
        surveys = [
            {
                'task_type': 'survey',
                'description': 'Responde esta encuesta breve para ayudarnos a mejorar BoostMe.',
                'boost_reward': 6.00,
                'content_type': 'survey',
                'content_url': None,
                'content_data': {
                    'survey_title': 'Encuesta 01 - BoostMe',
                    'questions': [
                        {'id': 'q1', 'question': '¿Con qué frecuencia usas BoostMe?', 'type': 'single_choice', 'options': ['Todos los días', 'Varias veces a la semana', 'Una vez a la semana', 'Menos de una vez a la semana']},
                        {'id': 'q2', 'question': '¿Qué característica de BoostMe valoras más?', 'type': 'single_choice', 'options': ['Tareas', 'Recompensas', 'Referidos', 'Progreso']},
                        {'id': 'q3', 'question': '¿Qué mejorarías en BoostMe?', 'type': 'text', 'options': []}
                    ]
                },
                'action_type': 'survey',
                'action_url': None,
                'simulated_action': 'survey',
                'simulated_content': 'Encuesta 01'
            },
            {
                'task_type': 'survey',
                'description': 'Ayúdanos a mejorar la plataforma respondiendo esta breve encuesta.',
                'boost_reward': 6.00,
                'content_type': 'survey',
                'content_url': None,
                'content_data': {
                    'survey_title': 'Encuesta 02 - Satisfacción',
                    'questions': [
                        {'id': 'q1', 'question': '¿Qué tan fácil te resulta usar BoostMe?', 'type': 'single_choice', 'options': ['Muy fácil', 'Fácil', 'Regular', 'Difícil']},
                        {'id': 'q2', 'question': '¿Qué contenido te gustaría ver más?', 'type': 'single_choice', 'options': ['Tareas', 'Videos', 'Recompensas', 'Referidos']},
                        {'id': 'q3', 'question': '¿Alguna sugerencia adicional?', 'type': 'text', 'options': []}
                    ]
                },
                'action_type': 'survey',
                'action_url': None,
                'simulated_action': 'survey',
                'simulated_content': 'Encuesta 02'
            },
            {
                'task_type': 'survey',
                'description': 'Comparte tu opinión en esta encuesta corta.',
                'boost_reward': 6.00,
                'content_type': 'survey',
                'content_url': None,
                'content_data': {
                    'survey_title': 'Encuesta 03 - Feedback',
                    'questions': [
                        {'id': 'q1', 'question': '¿Qué te motiva a usar BoostMe?', 'type': 'single_choice', 'options': ['Recompensas', 'Progreso', 'Retos', 'Referidos']},
                        {'id': 'q2', 'question': '¿Qué mejorarías primero?', 'type': 'single_choice', 'options': ['Interfaz', 'Tareas', 'Recompensas', 'Soporte']},
                        {'id': 'q3', 'question': 'Describe tu experiencia en una frase.', 'type': 'text', 'options': []}
                    ]
                },
                'action_type': 'survey',
                'action_url': None,
                'simulated_action': 'survey',
                'simulated_content': 'Encuesta 03'
            },
            {
                'task_type': 'survey',
                'description': 'Ayúdanos a entender mejor tus intereses.',
                'boost_reward': 6.00,
                'content_type': 'survey',
                'content_url': None,
                'content_data': {
                    'survey_title': 'Encuesta 04 - Intereses',
                    'questions': [
                        {'id': 'q1', 'question': '¿Qué tipo de contenido prefieres?', 'type': 'single_choice', 'options': ['Videos', 'Tutoriales', 'Retos', 'Recompensas']},
                        {'id': 'q2', 'question': '¿Qué te gustaría lograr con BoostMe?', 'type': 'single_choice', 'options': ['Ganancias', 'Progreso', 'Métricas', 'Recompensas']},
                        {'id': 'q3', 'question': '¿Qué te falta hoy?', 'type': 'text', 'options': []}
                    ]
                },
                'action_type': 'survey',
                'action_url': None,
                'simulated_action': 'survey',
                'simulated_content': 'Encuesta 04'
            },
            {
                'task_type': 'survey',
                'description': 'Tu opinión nos ayuda a mejorar la experiencia.',
                'boost_reward': 6.00,
                'content_type': 'survey',
                'content_url': None,
                'content_data': {
                    'survey_title': 'Encuesta 05 - Experiencia',
                    'questions': [
                        {'id': 'q1', 'question': '¿Qué tan claro te parece el panel?', 'type': 'single_choice', 'options': ['Muy claro', 'Claro', 'Regular', 'Confuso']},
                        {'id': 'q2', 'question': '¿Qué mejora priorizarías?', 'type': 'single_choice', 'options': ['Diseño', 'Rapidez', 'Tareas', 'Soporte']},
                        {'id': 'q3', 'question': '¿Qué destacarías de BoostMe?', 'type': 'text', 'options': []}
                    ]
                },
                'action_type': 'survey',
                'action_url': None,
                'simulated_action': 'survey',
                'simulated_content': 'Encuesta 05'
            },
            {
                'task_type': 'survey',
                'description': 'Ayúdanos a elegir nuevas mejoras para BoostMe.',
                'boost_reward': 6.00,
                'content_type': 'survey',
                'content_url': None,
                'content_data': {
                    'survey_title': 'Encuesta 06 - Mejoras',
                    'questions': [
                        {'id': 'q1', 'question': '¿Qué te gustaría ver mejorado?', 'type': 'single_choice', 'options': ['Interfaz', 'Recompensas', 'Retos', 'Reportes']},
                        {'id': 'q2', 'question': '¿Qué haría BoostMe más útil para ti?', 'type': 'single_choice', 'options': ['Más retos', 'Más videos', 'Más recompensas', 'Más métricas']},
                        {'id': 'q3', 'question': '¿Hay algo que quieras compartir?', 'type': 'text', 'options': []}
                    ]
                },
                'action_type': 'survey',
                'action_url': None,
                'simulated_action': 'survey',
                'simulated_content': 'Encuesta 06'
            },
            {
                'task_type': 'survey',
                'description': 'Comparte tu opinión para mantener BoostMe relevante.',
                'boost_reward': 6.00,
                'content_type': 'survey',
                'content_url': None,
                'content_data': {
                    'survey_title': 'Encuesta 07 - Relevancia',
                    'questions': [
                        {'id': 'q1', 'question': '¿Cuánto te aporta BoostMe?', 'type': 'single_choice', 'options': ['Mucho', 'Algo', 'Poco', 'Nada']},
                        {'id': 'q2', 'question': '¿Qué te hace volver?', 'type': 'single_choice', 'options': ['Recompensas', 'Progreso', 'Retos', 'Referidos']},
                        {'id': 'q3', 'question': '¿Qué cambiarías para volver más?', 'type': 'text', 'options': []}
                    ]
                },
                'action_type': 'survey',
                'action_url': None,
                'simulated_action': 'survey',
                'simulated_content': 'Encuesta 07'
            },
            {
                'task_type': 'survey',
                'description': 'Ayúdanos a entender tu ritmo de uso.',
                'boost_reward': 6.00,
                'content_type': 'survey',
                'content_url': None,
                'content_data': {
                    'survey_title': 'Encuesta 08 - Ritmo',
                    'questions': [
                        {'id': 'q1', 'question': '¿Con qué frecuencia vuelves a BoostMe?', 'type': 'single_choice', 'options': ['Diario', 'Varias veces por semana', 'Semanal', 'Rara vez']},
                        {'id': 'q2', 'question': '¿Qué te frena a usarlo más?', 'type': 'single_choice', 'options': ['Tiempo', 'Motivación', 'Interfaz', 'Falta de recompensas']},
                        {'id': 'q3', 'question': '¿Qué te gustaría que cambiara?', 'type': 'text', 'options': []}
                    ]
                },
                'action_type': 'survey',
                'action_url': None,
                'simulated_action': 'survey',
                'simulated_content': 'Encuesta 08'
            },
            {
                'task_type': 'survey',
                'description': 'Ayúdanos a descubrir qué te motiva más.',
                'boost_reward': 6.00,
                'content_type': 'survey',
                'content_url': None,
                'content_data': {
                    'survey_title': 'Encuesta 09 - Motivación',
                    'questions': [
                        {'id': 'q1', 'question': '¿Qué te motiva más?', 'type': 'single_choice', 'options': ['Recompensas', 'Retos', 'Progreso', 'Referidos']},
                        {'id': 'q2', 'question': '¿Qué te haría usarla más?', 'type': 'single_choice', 'options': ['Nuevos retos', 'Más recompensas', 'Más feedback', 'Mejor interfaz']},
                        {'id': 'q3', 'question': '¿Qué te gustaría recibir más?', 'type': 'text', 'options': []}
                    ]
                },
                'action_type': 'survey',
                'action_url': None,
                'simulated_action': 'survey',
                'simulated_content': 'Encuesta 09'
            },
            {
                'task_type': 'survey',
                'description': 'Cierra esta ronda con una última opinión breve.',
                'boost_reward': 6.00,
                'content_type': 'survey',
                'content_url': None,
                'content_data': {
                    'survey_title': 'Encuesta 10 - Cierre',
                    'questions': [
                        {'id': 'q1', 'question': '¿Qué tan satisfecho estás con BoostMe?', 'type': 'single_choice', 'options': ['Muy satisfecho', 'Satisfecho', 'Neutral', 'Insatisfecho']},
                        {'id': 'q2', 'question': '¿Qué deberíamos mejorar?', 'type': 'single_choice', 'options': ['Nada', 'Tareas', 'Recompensas', 'Soporte']},
                        {'id': 'q3', 'question': '¿Tienes algún mensaje final?', 'type': 'text', 'options': []}
                    ]
                },
                'action_type': 'survey',
                'action_url': None,
                'simulated_action': 'survey',
                'simulated_content': 'Encuesta 10'
            }
        ]
        existing_survey_titles = [
            task.content_data.get('survey_title')
            for task in Task.objects.filter(user=user, task_type='survey')
            if task.content_data and isinstance(task.content_data, dict) and task.content_data.get('survey_title')
        ]

        seen_titles = set(existing_survey_titles)
        available_surveys = [
            survey for survey in surveys
            if survey['content_data']['survey_title'] not in seen_titles
        ]

        if available_surveys:
            return random.choice(available_surveys)

        return None

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
