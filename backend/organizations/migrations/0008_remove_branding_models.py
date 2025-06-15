# This is a placeholder migration to fix the dependency issue
from django.db import migrations


class Migration(migrations.Migration):
    """
    This is a placeholder migration created to fix a dependency issue.
    Migration 0009 was referring to this migration, but the file was missing.
    """

    dependencies = [
        ('organizations', '0002_initial'),
    ]

    operations = [
        # No operations - this is a placeholder to satisfy the dependency chain
    ]
