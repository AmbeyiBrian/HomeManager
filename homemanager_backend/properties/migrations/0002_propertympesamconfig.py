# Generated manually on 2025-06-04

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('properties', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PropertyMpesaConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_active', models.BooleanField(default=True)),
                ('is_sandbox', models.BooleanField(default=True, help_text='Use M-Pesa sandbox for testing')),
                ('consumer_key', models.CharField(help_text='M-Pesa API consumer key', max_length=255)),
                ('consumer_secret', models.CharField(help_text='M-Pesa API consumer secret', max_length=255)),
                ('business_short_code', models.CharField(help_text='Paybill or Till number', max_length=10)),
                ('passkey', models.CharField(help_text='M-Pesa API passkey', max_length=255)),
                ('callback_url', models.URLField(blank=True, help_text='Optional custom callback URL', null=True)),
                ('timeout_url', models.URLField(blank=True, help_text='Optional custom timeout URL', null=True)),
                ('use_organization_config', models.BooleanField(default=True, help_text="Use organization's M-Pesa config instead of this one")),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('property', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='mpesa_config', to='properties.property')),
            ],
            options={
                'verbose_name': 'Property M-Pesa Configuration',
                'verbose_name_plural': 'Property M-Pesa Configurations',
            },
        ),
    ]
