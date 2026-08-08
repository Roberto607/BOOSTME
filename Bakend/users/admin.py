# accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # campos que se mostrarán en la lista
    list_display = ('username', 'email', 'first_name', 'is_staff', 'is_active', 'is_email_verified', 'is_wallet_verified', 'wallet_address', 'balance', 'level')
    list_filter = ('is_staff', 'is_active', 'is_email_verified', 'is_wallet_verified', 'level')
    search_fields = ('email', 'username', 'first_name', 'last_name', 'wallet_address')
    ordering = ('-date_joined',)

    # Campos que solo se leen (no editable)
    readonly_fields = ('join_date', 'date_joined', 'last_login', 'boost_balance', 'purchased_boost', 'earned_boost')

    # organización de los campos en el formulario del admin
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Información personal', {'fields': ('first_name', 'last_name', 'bio', 'photo')}),
        ('Ubicación', {'fields': ('country', 'city', 'phone')}),
        ('Wallet', {'fields': ('wallet_address', 'wallet_nonce', 'wallet_nonce_created_at', 'is_wallet_verified')}),
        ('Información financiera', {'fields': ('balance', 'boost_balance', 'purchased_boost', 'earned_boost', 'current_week_withdrawn', 'weekly_limit', 'has_financial_activation')}),
        ('Plan y nivel', {'fields': ('level', 'plan_name', 'plan_expiry_date')}),
        ('Verificación', {'fields': ('is_email_verified', 'join_date')}),
        ('Permisos', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Fechas importantes', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2', 'is_staff', 'is_active')}
        ),
    )

    filter_horizontal = ('groups', 'user_permissions',)


# Register your models here.
