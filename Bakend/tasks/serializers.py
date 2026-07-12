from rest_framework import serializers
from .models import Task, TaskCompletion

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            'id',
            'task_type',
            'status',
            'boost_reward',
            'created_at',
            'expires_at',
            'description',
            'content_type',
            'content_url',
            'content_data'
        ]
        read_only_fields = ['id', 'created_at', 'status']

class TaskCompletionSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo TaskCompletion.
    Maneja la conversión de datos de tareas completadas a/desde JSON.
    """
    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    
    class Meta:
        model = TaskCompletion
        fields = [
            'id',
            'task_name',
            'task_type_display',
            'completed_at',
            'streak_count',
            'boost_earned'
        ]
        read_only_fields = ['id', 'completed_at', 'boost_earned']

    def get_boost_earned(self, obj):
        """
        Calcula los BOOST ganados basados en el tipo de tarea.
        """
        boost_rewards = {
            'like': 2.00,
            'follow': 3.00,
            'video': 2.00,
            'survey': 5.00,
            'review': 4.00
        }
        return boost_rewards.get(obj.task_name, 2.00)

class TaskStreakSerializer(serializers.Serializer):
    """
    Serializador para mostrar información de la racha de tareas.
    """
    current_streak = serializers.IntegerField()
    last_completion = serializers.DateTimeField()
    total_completed_today = serializers.IntegerField()
    total_completed_this_week = serializers.IntegerField()
