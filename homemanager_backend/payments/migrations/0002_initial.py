# Generated by Django 5.2.1 on 2025-05-29 17:57

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('payments', '0001_initial'),
        ('properties', '0001_initial'),
        ('tenants', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='rentpayment',
            name='tenant',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rent_payments', to='tenants.tenant'),
        ),
        migrations.AddField(
            model_name='rentpayment',
            name='unit',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rent_payments', to='properties.unit'),
        ),
        migrations.AddField(
            model_name='mpesapayment',
            name='rent_payment',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mpesa_transactions', to='payments.rentpayment'),
        ),
    ]
