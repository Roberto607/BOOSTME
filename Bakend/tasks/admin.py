from django.contrib import admin
from django import forms
from .models import Task, TaskCompletion

class TaskForm(forms.ModelForm):
    """Formulario personalizado para Task con campos amigables en lugar de JSON"""
    
    # Campos de acción
    username = forms.CharField(required=False, label="Username/Perfil", help_text="Usuario a seguir, comentar, etc")
    platform = forms.ChoiceField(required=False, choices=[
        ('', '-- Selecciona --'),
        ('instagram', 'Instagram'),
        ('tiktok', 'TikTok'),
        ('youtube', 'YouTube'),
        ('twitter', 'Twitter'),
        ('facebook', 'Facebook'),
    ], label="Red Social")
    
    # Datos del contenido
    content_platform = forms.CharField(required=False, label="Plataforma del contenido")
    content_category = forms.CharField(required=False, label="Categoría del contenido")
    content_duration = forms.IntegerField(required=False, label="Duración (segundos)", min_value=0)
    
    class Meta:
        model = Task
        fields = [
            'user', 'task_type', 'status', 'boost_reward', 'description',
            'content_type', 'content_url', 'expires_at',
            'action_type', 'action_url'
        ]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Cargar datos existentes si es edición
        if self.instance.pk:
            if self.instance.action_data:
                self.fields['username'].initial = self.instance.action_data.get('username')
                self.fields['platform'].initial = self.instance.action_data.get('social_network')
            
            if self.instance.content_data:
                self.fields['content_platform'].initial = self.instance.content_data.get('platform')
                self.fields['content_category'].initial = self.instance.content_data.get('category')
                self.fields['content_duration'].initial = self.instance.content_data.get('duration')
    
    def save(self, commit=True):
        instance = super().save(commit=False)
        
        # Construir action_data desde campos del formulario
        action_data = {}
        if self.cleaned_data.get('username'):
            action_data['username'] = self.cleaned_data['username']
        if self.cleaned_data.get('platform'):
            action_data['social_network'] = self.cleaned_data['platform']
        if self.cleaned_data.get('action_type'):
            action_data['action'] = f"{self.cleaned_data['action_type']}_account"
        
        instance.action_data = action_data if action_data else {}
        
        # Construir content_data desde campos del formulario
        content_data = {}
        if self.cleaned_data.get('content_platform'):
            content_data['platform'] = self.cleaned_data['content_platform']
        if self.cleaned_data.get('content_category'):
            content_data['category'] = self.cleaned_data['content_category']
        if self.cleaned_data.get('content_duration'):
            content_data['duration'] = self.cleaned_data['content_duration']
        
        instance.content_data = content_data if content_data else {}
        
        if commit:
            instance.save()
        return instance

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    form = TaskForm
    list_display = ('id', 'user', 'task_type', 'status', 'boost_reward', 'created_at', 'expires_at')
    list_filter = ('task_type', 'status', 'created_at', 'content_type')
    search_fields = ('user__username', 'description', 'task_type')
    readonly_fields = ('created_at', 'completed_at', 'id')
    
    fieldsets = (
        ('Información de Usuario', {
            'fields': ('user', 'id')
        }),
        ('Tipo de Tarea', {
            'fields': ('task_type', 'status', 'description')
        }),
        ('Recompensa', {
            'fields': ('boost_reward',)
        }),
        ('Contenido', {
            'fields': ('content_type', 'content_url', 'content_platform', 'content_category', 'content_duration')
        }),
        ('Acción a Realizar', {
            'fields': ('action_type', 'action_url', 'username', 'platform'),
            'description': 'Define qué debe hacer el usuario'
        }),
        ('Fechas', {
            'fields': ('created_at', 'completed_at', 'expires_at')
        })
    )
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('user')

@admin.register(TaskCompletion)
class TaskCompletionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'task_name', 'streak_count', 'completed_at')
    list_filter = ('task_name', 'completed_at')
    search_fields = ('user__username', 'task_name')
    readonly_fields = ('completed_at', 'id')
    
    fieldsets = (
        ('Información', {
            'fields': ('user', 'task_name', 'id')
        }),
        ('Racha', {
            'fields': ('streak_count',)
        }),
        ('Fecha', {
            'fields': ('completed_at',)
        })
    )
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('user')
