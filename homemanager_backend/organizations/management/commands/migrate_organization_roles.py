from django.core.management.base import BaseCommand
from django.db import transaction
from organizations.models import BaseRole, Organization
from organizations.membership_models import OrganizationRole


class Command(BaseCommand):
    help = 'Migrate existing organization roles to use base roles'

    def handle(self, *args, **options):
        """Migrate existing OrganizationRole records to use BaseRole system"""
        
        # First, ensure base roles exist
        try:
            owner_role = BaseRole.objects.get(slug='owner')
            admin_role = BaseRole.objects.get(slug='admin')  
            manager_role = BaseRole.objects.get(slug='manager')
            member_role = BaseRole.objects.get(slug='member')
            guest_role = BaseRole.objects.get(slug='guest')
        except BaseRole.DoesNotExist:
            self.stdout.write(
                self.style.ERROR('Base roles not found. Please run "python manage.py create_base_roles" first.')
            )
            return

        # Get all organization roles that don't have a base_role assigned
        orphaned_roles = OrganizationRole.objects.filter(base_role__isnull=True)
        
        self.stdout.write(f'Found {orphaned_roles.count()} organization roles without base roles')
        
        if orphaned_roles.count() == 0:
            self.stdout.write(self.style.SUCCESS('No roles to migrate. All roles already have base roles assigned.'))
            return

        with transaction.atomic():
            migrated_count = 0
            
            for org_role in orphaned_roles:
                # Copy legacy permissions to the new legacy fields
                org_role._legacy_can_manage_users = getattr(org_role, 'can_manage_users', False)
                org_role._legacy_can_manage_billing = getattr(org_role, 'can_manage_billing', False)
                org_role._legacy_can_manage_properties = getattr(org_role, 'can_manage_properties', False)
                org_role._legacy_can_manage_tenants = getattr(org_role, 'can_manage_tenants', False)
                org_role._legacy_can_view_reports = getattr(org_role, 'can_view_reports', False)
                
                # Determine the best matching base role based on legacy data
                # This is a simplified mapping - you might want to make it more sophisticated
                role_name = getattr(org_role, 'name', '').lower()
                role_type = getattr(org_role, 'role_type', '').lower()
                
                if 'owner' in role_name or role_type == 'owner':
                    org_role.base_role = owner_role
                elif 'admin' in role_name or role_type == 'admin':
                    org_role.base_role = admin_role
                elif 'manager' in role_name or role_type == 'manager':
                    org_role.base_role = manager_role
                elif 'guest' in role_name or role_type == 'guest':
                    org_role.base_role = guest_role
                else:
                    # Default to member role
                    org_role.base_role = member_role
                
                org_role.save()
                migrated_count += 1
                
                self.stdout.write(
                    f'Migrated role "{getattr(org_role, "name", "Unknown")}" '
                    f'in organization "{org_role.organization.name}" '
                    f'to base role "{org_role.base_role.name}"'
                )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully migrated {migrated_count} organization roles')
        )
        
        # Now create missing organization roles for each organization
        self.stdout.write('Creating missing organization roles for each organization...')
        
        organizations = Organization.objects.all()
        created_roles_count = 0
        
        for org in organizations:
            base_roles = BaseRole.objects.all()
            
            for base_role in base_roles:
                org_role, created = OrganizationRole.objects.get_or_create(
                    organization=org,
                    base_role=base_role
                )
                
                if created:
                    created_roles_count += 1
                    self.stdout.write(
                        f'Created {base_role.name} role for {org.name}'
                    )
        
        self.stdout.write(
            self.style.SUCCESS(f'Created {created_roles_count} new organization roles')
        )
