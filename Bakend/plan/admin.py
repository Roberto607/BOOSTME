from django.contrib import admin
from django import forms
from users.models import UserPlan
from .models import PlanDefinition


class PlanDefinitionForm(forms.ModelForm):
    feature_1 = forms.CharField(required=False, label='Característica 1')
    feature_2 = forms.CharField(required=False, label='Característica 2')
    feature_3 = forms.CharField(required=False, label='Característica 3')
    feature_4 = forms.CharField(required=False, label='Característica 4')
    feature_5 = forms.CharField(required=False, label='Característica 5')
    feature_6 = forms.CharField(required=False, label='Característica 6')
    feature_7 = forms.CharField(required=False, label='Característica 7')
    feature_8 = forms.CharField(required=False, label='Característica 8')
    feature_9 = forms.CharField(required=False, label='Característica 9')
    feature_10 = forms.CharField(required=False, label='Característica 10')

    class Meta:
        model = PlanDefinition
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        existing_features = []
        if self.instance and self.instance.features:
            existing_features = [line.strip() for line in str(self.instance.features).splitlines() if line.strip()]

        for index, field_name in enumerate(['feature_1', 'feature_2', 'feature_3', 'feature_4', 'feature_5', 'feature_6', 'feature_7', 'feature_8', 'feature_9', 'feature_10'], start=1):
            if index <= len(existing_features):
                self.fields[field_name].initial = existing_features[index - 1]

    def save(self, commit=True):
        instance = super().save(commit=False)
        features = [
            self.cleaned_data.get('feature_1', '').strip(),
            self.cleaned_data.get('feature_2', '').strip(),
            self.cleaned_data.get('feature_3', '').strip(),
            self.cleaned_data.get('feature_4', '').strip(),
            self.cleaned_data.get('feature_5', '').strip(),
            self.cleaned_data.get('feature_6', '').strip(),
            self.cleaned_data.get('feature_7', '').strip(),
            self.cleaned_data.get('feature_8', '').strip(),
            self.cleaned_data.get('feature_9', '').strip(),
            self.cleaned_data.get('feature_10', '').strip(),
        ]
        instance.features = '\n'.join([feature for feature in features if feature])
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
        ('Características', {'fields': (('feature_1', 'feature_2', 'feature_3', 'feature_4', 'feature_5'), ('feature_6', 'feature_7', 'feature_8', 'feature_9', 'feature_10'))}),
    )


@admin.register(UserPlan)
class UserPlanAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan_name', 'daily_tasks', 'bonus_percentage', 'weekly_withdrawal_limit', 'price', 'is_active', 'updated_at')
    list_filter = ('plan_name', 'is_active')
    search_fields = ('user__username', 'user__email', 'plan_name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-updated_at',)
