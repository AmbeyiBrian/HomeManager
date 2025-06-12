from django.core.management.base import BaseCommand
from django.db import transaction
from organizations.models import BaseRole


class Command(BaseCommand):
    help = 'Create predefined base roles for the system'

    def handle(self, *args, **options):
        """Create base roles that organizations can customize"""
        
        base_roles_data = [
            {
                'name': 'Owner',
                'slug': 'owner',
                'description': 'Organization owner with full access to all features',
                'role_type': 'owner',
                'default_can_manage_users': True,
                'default_can_manage_billing': True,
                'default_can_manage_properties': True,
                'default_can_manage_tenants': True,
                'default_can_view_reports': True,
                'default_can_manage_roles': True,
                'default_can_manage_system_settings': True,
                'default_can_view_dashboard': True,
                'default_can_manage_tickets': True,
                'default_manage_notices': True,
            },
            {
                'name': 'Administrator',
                'slug': 'admin',
                'description': 'Full administrative access except billing and system settings',
                'role_type': 'admin',
                'default_can_manage_users': True,
                'default_can_manage_billing': False,
                'default_can_manage_properties': True,
                'default_can_manage_tenants': True,
                'default_can_view_reports': True,
                'default_can_manage_roles': True,
                'default_can_manage_system_settings': False,
                'default_can_view_dashboard': True,
                'default_can_manage_tickets': True,
                'default_manage_notices': True,
            },
            {
                'name': 'Manager',
                'slug': 'manager',
                'description': 'Property and tenant management with limited user access',
                'role_type': 'manager',
                'default_can_manage_users': True,
                'default_can_manage_billing': False,
                'default_can_manage_properties': True,
                'default_can_manage_tenants': True,
                'default_can_view_reports': True,
                'default_can_manage_roles': False,
                'default_can_manage_system_settings': False,
                'default_can_view_dashboard': True,
                'default_can_manage_tickets': True,
                'default_manage_notices': True,
            },
            {
                'name': 'Member',
                'slug': 'member',
                'description': 'Basic access to view and manage assigned properties',
                'role_type': 'member',
                'default_can_manage_users': False,
                'default_can_manage_billing': False,
                'default_can_manage_properties': True,
                'default_can_manage_tenants': True,
                'default_can_view_reports': False,
                'default_can_manage_roles': False,
                'default_can_manage_system_settings': False,
                'default_can_view_dashboard': True,
                'default_can_manage_tickets': True,
                'default_manage_notices': False,
            },
            {
                'name': 'Guest',
                'slug': 'guest',
                'description': 'Limited read-only access to basic information',
                'role_type': 'guest',
                'default_can_manage_users': False,
                'default_can_manage_billing': False,
                'default_can_manage_properties': False,
                'default_can_manage_tenants': False,
                'default_can_view_reports': False,
                'default_can_manage_roles': False,
                'default_can_manage_system_settings': False,
                'default_can_view_dashboard': True,
                'default_can_manage_tickets': False,
                'default_manage_notices': False,
            },
        ]

        with transaction.atomic():
            created_count = 0
            updated_count = 0
            
            for role_data in base_roles_data:
                base_role, created = BaseRole.objects.get_or_create(
                    slug=role_data['slug'],
                    defaults=role_data
                )
                
                if created:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'Created base role: {base_role.name}')
                    )
                else:
                    # Update existing role with new data
                    for key, value in role_data.items():
                        if key != 'slug':  # Don't update the slug
                            setattr(base_role, key, value)
                    base_role.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'Updated base role: {base_role.name}')
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nBase roles setup complete:\n'
                f'- Created: {created_count} roles\n'
                f'- Updated: {updated_count} roles\n'
                f'- Total: {BaseRole.objects.count()} base roles in system'
            )
        )
