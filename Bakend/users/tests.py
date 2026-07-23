from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIRequestFactory, APIClient, force_authenticate

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


class RegisterVerificationLinkTests(TestCase):
    @override_settings(DEBUG=False, EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_register_returns_verification_link_as_fallback(self):
        client = APIClient()

        response = client.post('/api/users/register/', {
            'username': 'manualverify1',
            'email': 'manualverify1@example.com',
            'password': 'Password123!',
            'password2': 'Password123!',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertIn('verification_link', response.data)
        self.assertTrue(response.data['verification_link'].startswith('http'))


class LoginViewTests(TestCase):
    def test_login_returns_access_and_refresh_tokens_for_verified_user(self):
        User = get_user_model()
        user = User.objects.create_user(
            username='loginuser',
            email='loginuser@example.com',
            password='Password123!',
            is_active=True,
            is_email_verified=True,
        )

        client = APIClient()
        response = client.post('/api/users/login/', {
            'username': 'loginuser',
            'password': 'Password123!',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], user.email)
