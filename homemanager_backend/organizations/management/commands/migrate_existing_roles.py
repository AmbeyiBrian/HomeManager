from django.core.management.base import BaseCommand
from django.db import transaction
from organizations.models import BaseRole, Organization
from organizations.membership_models import OrganizationRole


class Command(BaseCommand):
    help = 'Migrate existing organization roles to use base role system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Get all existing organization roles
        existing_roles = OrganizationRole.objects.all()
        
        if not existing_roles.exists():
            self.stdout.write(self.style.SUCCESS('No existing roles to migrate'))
            return
        
        # Create mapping from role types to base roles
        try:
            base_role_mapping = {
                'owner': BaseRole.objects.get(slug='owner'),
                'admin': BaseRole.objects.get(slug='admin'),
                'manager': BaseRole.objects.get(slug='manager'),
                'member': BaseRole.objects.get(slug='member'),
                'guest': BaseRole.objects.get(slug='guest'),
            }
        except BaseRole.DoesNotExist as e:
            self.stdout.write(
                self.style.ERROR(
                    f'Base roles not found. Please run "python manage.py create_base_roles" first.\n'
                    f'Error: {e}'
                )
            )
            return
        
        migration_stats = {
            'migrated': 0,
            'skipped': 0,
            'errors': 0
        }
        
        with transaction.atomic():
            if dry_run:
                # Use savepoint for dry run
                sid = transaction.savepoint()
            
            for role in existing_roles:
                try:
                    # Determine which base role to use
                    base_role = None
                    
                    # Check if role already has a base_role assigned
                    if hasattr(role, 'base_role') and role.base_role:
                        self.stdout.write(f'Role {role} already has base_role assigned, skipping')
                        migration_stats['skipped'] += 1
                        continue
                    
                    # Try to match by role_type first
                    if hasattr(role, 'role_type') and role.role_type in base_role_mapping:
                        base_role = base_role_mapping[role.role_type]
                    else:
                        # Try to match by name (case insensitive)
                        role_name_lower = role.name.lower() if hasattr(role, 'name') else ''
                        if 'owner' in role_name_lower:
                            base_role = base_role_mapping['owner']
                        elif 'admin' in role_name_lower:
                            base_role = base_role_mapping['admin']
                        elif 'manager' in role_name_lower:
                            base_role = base_role_mapping['manager']
                        elif 'member' in role_name_lower:
                            base_role = base_role_mapping['member']
                        else:
                            base_role = base_role_mapping['guest']  # Default fallback
                    
                    if not dry_run:
                        # Assign base role
                        role.base_role = base_role
                        
                        # Move existing permissions to legacy fields
                        if hasattr(role, 'can_manage_users'):
                            role._legacy_can_manage_users = role.can_manage_users
                        if hasattr(role, 'can_manage_billing'):
                            role._legacy_can_manage_billing = role.can_manage_billing
                        if hasattr(role, 'can_manage_properties'):
                            role._legacy_can_manage_properties = role.can_manage_properties
                        if hasattr(role, 'can_manage_tenants'):
                            role._legacy_can_manage_tenants = role.can_manage_tenants
                        if hasattr(role, 'can_view_reports'):
                            role._legacy_can_view_reports = role.can_view_reports
                        
                        role.save()
                    
                    self.stdout.write(
                        f'{"[DRY RUN] " if dry_run else ""}Migrated role: {role.organization.name} - '
                        f'{getattr(role, "name", "Unknown")} -> {base_role.name}'
                    )
                    migration_stats['migrated'] += 1
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f'Error migrating role {role}: {e}'
                        )
                    )
                    migration_stats['errors'] += 1
            
            if dry_run:
                # Rollback dry run changes
                transaction.savepoint_rollback(sid)
        
        # Print summary
        self.stdout.write(
            self.style.SUCCESS(
                f'\n{"DRY RUN " if dry_run else ""}Migration Summary:\n'
                f'- Migrated: {migration_stats["migrated"]} roles\n'
                f'- Skipped: {migration_stats["skipped"]} roles\n'
                f'- Errors: {migration_stats["errors"]} roles\n'
            )
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    '\nThis was a dry run. To perform the actual migration, '
                    'run the command without --dry-run'
                )
            )
