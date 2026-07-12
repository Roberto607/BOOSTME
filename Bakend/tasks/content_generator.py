import random
import os
from django.conf import settings

class ContentGenerator:
    def __init__(self):
        self.media_root = settings.MEDIA_ROOT
        self.tasks_images_dir = os.path.join(self.media_root, 'tasks', 'images')
        self.tasks_videos_dir = os.path.join(self.media_root, 'tasks', 'videos')
        
        # Crear directorios si no existen
        os.makedirs(self.tasks_images_dir, exist_ok=True)
        os.makedirs(self.tasks_videos_dir, exist_ok=True)

    def get_random_content(self, task_type):
        """Genera contenido aleatorio para cada tipo de tarea."""
        if task_type == 'like':
            return self.get_image_content()
        elif task_type == 'video':
            return self.get_video_content()
        elif task_type == 'follow':
            return self.get_profile_content()
        elif task_type == 'survey':
            return self.get_survey_content()
        return self.get_text_content()

    def get_image_content(self):
        """Genera contenido para tareas de like."""
        images = [
            {
                'url': '/media/tasks/images/sunset.jpg',
                'description': 'Hermoso atardecer 🌅',
                'likes': random.randint(100, 1000)
            },
            {
                'url': '/media/tasks/images/food.jpg',
                'description': 'Deliciosa comida 🍕',
                'likes': random.randint(200, 2000)
            }
        ]
        return random.choice(images)

    def get_video_content(self):
        """Genera contenido para tareas de video."""
        videos = [
            {
                'url': '/media/tasks/videos/dance.mp4',
                'description': 'Baile divertido 💃',
                'views': random.randint(1000, 10000),
                'likes': random.randint(100, 1000)
            }
        ]
        return random.choice(videos)

    def get_profile_content(self):
        """Genera contenido para tareas de follow."""
        profiles = [
            {
                'url': '/media/tasks/images/profile1.jpg',
                'username': 'travel_lover',
                'description': 'Viajero incansable ✈️',
                'followers': random.randint(1000, 10000),
                'posts': random.randint(50, 200)
            }
        ]
        return random.choice(profiles)

    def get_survey_content(self):
        """Genera contenido para encuestas."""
        surveys = [
            {
                'question': '¿Qué te parece nuestra app?',
                'options': ['Excelente', 'Buena', 'Regular', 'Mala'],
                'type': 'rating'
            }
        ]
        return random.choice(surveys)

    def get_text_content(self):
        """Genera contenido de texto."""
        texts = [
            {
                'content': 'Comparte tu experiencia',
                'type': 'share'
            }
        ]
        return random.choice(texts)
