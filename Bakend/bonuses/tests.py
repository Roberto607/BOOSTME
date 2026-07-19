from django.test import TestCase
from rest_framework.test import APIClient

from .models import BonusType


class BonusTypesApiTests(TestCase):
    def test_bonus_types_are_accessible_without_authentication(self):
        BonusType.objects.create(
            name='Bono de prueba',
            description='Disponible para todos',
            bonus_type='tasks',
            value='15.00',
            requirement_value=10,
            is_active=True,
        )

        client = APIClient()
        response = client.get('/api/bonuses/bonus-types/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['name'], 'Bono de prueba')
