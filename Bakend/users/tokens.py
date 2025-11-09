# tokens.py
from django.contrib.auth.tokens import PasswordResetTokenGenerator
import six

class AccountActivationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        """
        Crea un hash que incluye:
        - ID del usuario
        - Timestamp actual
        - Estado de verificación del email
        """
        return str(user.pk) + str(timestamp) + str(user.is_email_verified)



class PasswordResetTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return (
            six.text_type(user.pk) + six.text_type(timestamp) +
            six.text_type(user.last_login)
        )

# Instancia global del generador de tokens
account_activation_token = AccountActivationTokenGenerator()
password_reset_token = PasswordResetTokenGenerator()