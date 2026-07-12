from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIRequestFactory, force_authenticate

from users.views import ProfileView


class ProfilePhotoTests(TestCase):
    def test_profile_response_returns_absolute_photo_url(self):
        User = get_user_model()
        user = User.objects.create_user(
            username='photo_user',
            email='photo@example.com',
            password='password123',
            is_active=True,
        )
        user.photo = SimpleUploadedFile(
            'avatar.jpg',
            b'fake-image-bytes',
            content_type='image/jpeg',
        )
        user.save()

        factory = APIRequestFactory()
        request = factory.get('/profile/')
        force_authenticate(request, user=user)

        response = ProfileView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['photo_url'].startswith('http://testserver/'))
