#!/usr/bin/env python

"""
Django management command to create organization roles for all organizations.
This ensures every organization has all available base roles.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from organizations.models import Organization, BaseRole
from organizations.membership_models import OrganizationRole


class Command(BaseCommand):
    help = 'Create organization roles for all organizations based on base roles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run in dry-run mode without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Running in DRY-RUN mode - no changes will be made'))

        created_count = 0
        updated_count = 0
        
        try:
            with transaction.atomic():
                # Get all organizations and base roles
                organizations = Organization.objects.all()
                base_roles = BaseRole.objects.all()
                
                self.stdout.write(f'Found {organizations.count()} organizations and {base_roles.count()} base roles')
                
                for organization in organizations:
                    self.stdout.write(f'Processing organization: {organization.name}')
                    
                    for base_role in base_roles:
                        # Check if organization role already exists
                        org_role, created = OrganizationRole.objects.get_or_create(
                            organization=organization,
                            base_role=base_role
                        )
                        
                        if created:
                            created_count += 1
                            self.stdout.write(
                                self.style.SUCCESS(f'  ✓ Created role: {base_role.name}')
                            )
                        else:
                            # Update existing role to ensure it has a base_role reference
                            if not org_role.base_role:
                                org_role.base_role = base_role
                                if not dry_run:
                                    org_role.save()
                                updated_count += 1
                                self.stdout.write(
                                    self.style.SUCCESS(f'  ✓ Updated role: {base_role.name}')
                                )
                            else:
                                self.stdout.write(f'  - Role already exists: {base_role.name}')
                
                if dry_run:
                    # Rollback transaction in dry-run mode
                    raise Exception("Dry run - rolling back changes")
                    
        except Exception as e:
            if "Dry run" in str(e):
                self.stdout.write(self.style.WARNING('Dry run completed - no changes were saved'))
            else:
                self.stdout.write(self.style.ERROR(f'Error: {e}'))
                return
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Organization roles setup complete:'))
        self.stdout.write(f'- Created: {created_count} roles')
        self.stdout.write(f'- Updated: {updated_count} roles')
        self.stdout.write(f'- Total organizations: {organizations.count()}')
        self.stdout.write(f'- Total base roles: {base_roles.count()}')
