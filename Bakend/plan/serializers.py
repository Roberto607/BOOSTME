from rest_framework import serializers
from .models import PlanDefinition


class PlanDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanDefinition
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'price',
            'is_free',
            'recommended',
            'is_active',
            'features',
            'daily_tasks',
            'bonus_percentage',
            'weekly_withdrawal_limit',
            'min_referrals',
            'commission_percentage',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        raw_features = data.get('features') or ''
        if isinstance(raw_features, str):
            data['features'] = [line.strip() for line in raw_features.splitlines() if line.strip()]
        elif isinstance(raw_features, (list, tuple)):
            data['features'] = [str(item).strip() for item in raw_features if str(item).strip()]
        else:
            data['features'] = []
        return data
