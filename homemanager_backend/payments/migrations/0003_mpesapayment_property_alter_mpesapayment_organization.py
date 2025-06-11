# Generated manually on 2025-06-04

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('properties', '0002_propertympesamconfig'),
        ('payments', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='mpesapayment',
            name='property',
            field=models.ForeignKey(default=None, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='mpesa_payments', to='properties.property'),
        ),
        migrations.AlterField(
            model_name='mpesapayment',
            name='organization',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='mpesa_payments', to='organizations.organization'),
        ),
    ]
