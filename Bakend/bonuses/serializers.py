from rest_framework import serializers
from .models import BonusType, UserBonus, UserStreak


class BonusTypeSerializer(serializers.ModelSerializer):
    features = serializers.SerializerMethodField()
    value = serializers.SerializerMethodField()

    class Meta:
        model = BonusType
        fields = ['id', 'name', 'description', 'bonus_type', 'value', 'requirement_value', 'is_active', 'features']
        read_only_fields = ['id']

    def get_features(self, obj):
        if not obj.description:
            return []
        return [line.strip() for line in str(obj.description).splitlines() if line.strip()]

    def get_value(self, obj):
        return float(obj.value)


class UserBonusSerializer(serializers.ModelSerializer):
    bonus_name = serializers.CharField(source='bonus_type.name', read_only=True)
    requirement_value = serializers.SerializerMethodField()
    current_progress = serializers.SerializerMethodField()

    class Meta:
        model = UserBonus
        fields = ['id', 'user', 'bonus_type', 'bonus_name', 'status', 'amount',
                 'current_progress', 'requirement_value', 'created_at', 'claimed_at']
        read_only_fields = ['id', 'user', 'amount', 'created_at', 'claimed_at']

    def get_requirement_value(self, obj):
        return obj.bonus_type.requirement_value

    def get_current_progress(self, obj):
        return 0


class UserStreakSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserStreak
        fields = ['id', 'user', 'current_streak', 'max_streak', 'last_activity']
        read_only_fields = ['id', 'user']
