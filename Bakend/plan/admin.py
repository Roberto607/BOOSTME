from django.contrib import admin
from django import forms
from users.models import UserPlan
from .models import PlanDefinition


class PlanDefinitionForm(forms.ModelForm):
    task_choices = forms.MultipleChoiceField(
        required=False,
        choices=PlanDefinition.TASK_TYPE_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        label='Tareas del plan'
    )

    feature_choices = forms.MultipleChoiceField(
        required=False,
        choices=PlanDefinition.FEATURE_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        label='Características del plan'
    )

    class Meta:
        model = PlanDefinition
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.task_types:
            existing_task_types = [line.strip() for line in str(self.instance.task_types).splitlines() if line.strip()]
            self.fields['task_choices'].initial = [task for task in existing_task_types if task in dict(self.fields['task_choices'].choices)]

        if self.instance and self.instance.features:
            existing_features = [line.strip() for line in str(self.instance.features).splitlines() if line.strip()]
            self.fields['feature_choices'].initial = [feature for feature in existing_features if feature in dict(self.fields['feature_choices'].choices)]

        self.fields['name'].widget = forms.Select(choices=PlanDefinition.PLAN_CHOICES)
        self.fields['is_free'].help_text = 'Marca esto si este plan debe ser tratado como gratuito.'

    def clean_name(self):
        name = self.cleaned_data.get('name')
        if name not in dict(PlanDefinition.PLAN_CHOICES):
            raise forms.ValidationError('Selecciona un plan válido.')
        return name

    def save(self, commit=True):
        instance = super().save(commit=False)
        selected_features = self.cleaned_data.get('feature_choices', []) or []
        instance.features = '\n'.join(selected_features)
        selected_tasks = self.cleaned_data.get('task_choices', []) or []
        instance.task_types = '\n'.join(selected_tasks)
        if commit:
            instance.save()
        return instance


@admin.register(PlanDefinition)
class PlanDefinitionAdmin(admin.ModelAdmin):
    form = PlanDefinitionForm
    list_display = ('name', 'slug', 'price', 'is_free', 'recommended', 'is_active', 'daily_tasks', 'bonus_percentage', 'weekly_withdrawal_limit')
    list_filter = ('is_free', 'recommended', 'is_active')
    search_fields = ('name', 'slug', 'description')
    ordering = ('price',)
    prepopulated_fields = {'slug': ('name',)}
    fieldsets = (
        (None, {'fields': ('name', 'slug', 'description', 'price', 'is_free', 'recommended', 'is_active')}),
        ('Configuración del plan', {'fields': ('daily_tasks', 'bonus_percentage', 'weekly_withdrawal_limit', 'min_referrals', 'commission_percentage')}),
        ('Tareas del plan', {'fields': ('task_choices',)}),
        ('Características', {'fields': ('feature_choices',)}),
    )


@admin.register(UserPlan)
class UserPlanAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan_name', 'daily_tasks', 'bonus_percentage', 'weekly_withdrawal_limit', 'price', 'is_active', 'updated_at')
    list_filter = ('plan_name', 'is_active')
    search_fields = ('user__username', 'user__email', 'plan_name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-updated_at',)
