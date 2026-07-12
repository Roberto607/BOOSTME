from rest_framework import serializers
from .models import BonusType, UserBonus, UserStreak

class BonusTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BonusType
        fields = ['id', 'name', 'description', 'reward_amount', 'requirement_type', 
                 'requirement_value', 'is_active']
        read_only_fields = ['id']

class UserBonusSerializer(serializers.ModelSerializer):
    bonus_name = serializers.CharField(source='bonus_type.name', read_only=True)
    
    class Meta:
        model = UserBonus
        fields = ['id', 'user', 'bonus_type', 'bonus_name', 'status', 'amount',
                 'current_progress', 'requirement_value', 'created_at', 
                 'claimed_at']
        read_only_fields = ['id', 'user', 'amount', 'created_at', 'claimed_at']

class UserStreakSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserStreak
        fields = ['id', 'user', 'current_streak', 'max_streak', 'last_activity']
        read_only_fields = ['id', 'user']
