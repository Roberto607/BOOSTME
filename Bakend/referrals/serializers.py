from decimal import Decimal
from rest_framework import serializers
from django.db import models
from django.utils import timezone
from .models import ReferralSystem, ReferralEarning, ReferralWithdrawal

class ReferralSystemSerializer(serializers.ModelSerializer):
    referral_code = serializers.ReadOnlyField()
    referral_count = serializers.ReadOnlyField()
    total_referral_earnings = serializers.ReadOnlyField()
    can_withdraw = serializers.SerializerMethodField()
    pending_earnings = serializers.SerializerMethodField()
    commission_rate = serializers.SerializerMethodField()

    class Meta:
        model = ReferralSystem
        fields = [
            'referral_code',
            'referral_count',
            'total_referral_earnings',
            'can_withdraw',
            'pending_earnings',
            'commission_rate'
        ]

    def get_can_withdraw(self, obj):
        # Defensive: support both ReferralSystem and user-like objects.
        try:
            user = None
            if hasattr(obj, 'user') and getattr(obj, 'user', None) is not None:
                user = getattr(obj, 'user')
            elif hasattr(obj, 'plan_name') or hasattr(obj, 'earned_boost'):
                user = obj

            if user is None:
                return False

            if hasattr(user, 'can_withdraw'):
                val = getattr(user, 'can_withdraw')
                return bool(val() if callable(val) else val)

            earned_boost = Decimal(str(getattr(user, 'earned_boost', 0) or 0))
            current_week_withdrawn = Decimal(str(getattr(user, 'current_week_withdrawn', 0) or 0))
            weekly_limit = Decimal(str(getattr(user, 'weekly_limit', 100) or 100))

            not_expired = True
            plan_expiry_date = getattr(user, 'plan_expiry_date', None)
            if plan_expiry_date:
                try:
                    not_expired = plan_expiry_date > timezone.now()
                except Exception:
                    not_expired = True

            return (
                earned_boost > 0 and
                current_week_withdrawn < weekly_limit and
                (not_expired or getattr(user, 'has_financial_activation', False))
            )
        except Exception:
            return False

    def get_pending_earnings(self, obj):
        return ReferralEarning.objects.filter(
            referral_system=obj,
            is_paid=False
        ).aggregate(total=models.Sum('amount'))['total'] or 0

    def get_commission_rate(self, obj):
        """Obtener la tasa de comisión según el plan del usuario"""
        commission_rates = {
            'Free': 0.05,
            'Starter': 0.10,
            'Pro': 0.15,
            'Elite': 0.20
        }
        user = getattr(obj, 'user', None)
        plan_name = getattr(user, 'plan_name', None)
        # Fall back to obj.plan_name if present
        if not plan_name:
            plan_name = getattr(obj, 'plan_name', 'Free')
        return commission_rates.get(plan_name, 0.05)

class ReferralEarningSerializer(serializers.ModelSerializer):
    referred_user_username = serializers.CharField(source='referred_user.username', read_only=True)
    commission_percentage = serializers.SerializerMethodField()

    class Meta:
        model = ReferralEarning
        fields = [
            'id',
            'referred_user',
            'referred_user_username',
            'amount',
            'commission_rate',
            'commission_percentage',
            'created_at',
            'is_paid'
        ]

    def get_commission_percentage(self, obj):
        return float(obj.commission_rate) * 100

class ReferralWithdrawalSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ReferralWithdrawal
        fields = [
            'id',
            'amount',
            'status',
            'status_display',
            'created_at',
            'processed_at',
            'notes'
        ]
        read_only_fields = ['status', 'processed_at', 'notes']

class ReferralStatsSerializer(serializers.Serializer):
    referral_code = serializers.CharField()
    total_referrals = serializers.IntegerField()
    active_referrals = serializers.IntegerField()
    total_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    can_withdraw = serializers.BooleanField()
    min_withdrawal_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    commission_rate = serializers.DecimalField(max_digits=5, decimal_places=4)
