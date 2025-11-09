# accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # campos que se mostrarán en la lista
    list_display = ('email', 'username', 'is_staff', 'is_active', 'is_email_verified', 'balance', 'level')
    list_filter = ('is_staff', 'is_active', 'is_email_verified', 'level')
    search_fields = ('email', 'username')
    ordering = ('-date_joined',)

    # organización de los campos en el formulario del admin
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Información personal', {'fields': ('username', 'first_name', 'last_name')}),
        ('Datos extra', {'fields': ('is_email_verified', 'balance', 'level')}),
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
