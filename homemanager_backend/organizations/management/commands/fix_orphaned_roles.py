from django.core.management.base import BaseCommand
from organizations.membership_models import OrganizationRole, OrganizationMembership
from organizations.models import BaseRole


class Command(BaseCommand):
    help = 'Fix orphaned OrganizationRole records that have null organization'

    def handle(self, *args, **options):
        orphaned_roles = OrganizationRole.objects.filter(organization__isnull=True)
        self.stdout.write(f'Found {orphaned_roles.count()} orphaned roles')
        
        fixed_count = 0
        for role in orphaned_roles:
            # Find memberships that use this role
            memberships = OrganizationMembership.objects.filter(role=role)
            if memberships.exists():
                # Get the organization from the first membership
                org = memberships.first().organization
                self.stdout.write(f'Processing orphaned role {role.id} for org {org.name}')
                
                # Check if there's already a role for this base_role and organization
                existing_role = OrganizationRole.objects.filter(
                    organization=org, 
                    base_role=role.base_role
                ).exclude(id=role.id).first()
                
                if existing_role:
                    # Update all memberships to use the existing role
                    self.stdout.write(f'  Moving {memberships.count()} memberships from orphaned role {role.id} to existing role {existing_role.id}')
                    memberships.update(role=existing_role)
                    # Delete the orphaned role
                    role.delete()
                    fixed_count += 1
                else:
                    # Assign the orphaned role to the organization
                    self.stdout.write(f'  Assigning orphaned role {role.id} to organization {org.name}')
                    role.organization = org
                    role.save()
                    fixed_count += 1
            else:
                # No memberships use this role, safe to delete
                self.stdout.write(f'Deleting unused orphaned role {role.id}')
                role.delete()
                fixed_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Successfully fixed {fixed_count} orphaned roles'))
        
        # Final check
        remaining_orphaned = OrganizationRole.objects.filter(organization__isnull=True).count()
        if remaining_orphaned == 0:
            self.stdout.write(self.style.SUCCESS('All orphaned roles have been fixed!'))
        else:
            self.stdout.write(self.style.WARNING(f'Still have {remaining_orphaned} orphaned roles'))
