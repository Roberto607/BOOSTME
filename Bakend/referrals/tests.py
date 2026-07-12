from django.test import TestCase
from django.contrib.auth import get_user_model
from referrals.models import ReferralSystem
from referrals.serializers import ReferralSystemSerializer


class ReferralSerializerTests(TestCase):
    def test_can_withdraw_is_safe_for_user_without_custom_can_withdraw(self):
        User = get_user_model()
        user = User.objects.create_user(
            username='referral-user',
            email='referral@example.com',
            password='testpass123'
        )
        referral_system = ReferralSystem.objects.create(user=user)

        serializer = ReferralSystemSerializer(referral_system)
        data = serializer.data

        self.assertIn('can_withdraw', data)
        self.assertIsInstance(data['can_withdraw'], bool)
