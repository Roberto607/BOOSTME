from django.db import models


class PlanDefinition(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=60, unique=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_free = models.BooleanField(default=False)
    recommended = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    features = models.TextField(blank=True, help_text='Escribe las características del plan, una por línea.')
    daily_tasks = models.IntegerField(default=3)
    bonus_percentage = models.IntegerField(default=0)
    weekly_withdrawal_limit = models.DecimalField(max_digits=12, decimal_places=2, default=5)
    min_referrals = models.IntegerField(default=0)
    commission_percentage = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('price',)
        verbose_name = 'Plan'
        verbose_name_plural = 'Planes'

    def __str__(self):
        return self.name

