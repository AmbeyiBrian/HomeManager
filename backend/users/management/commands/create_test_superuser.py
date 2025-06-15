from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from organizations.models import Organization
from users.permissions import Role, UserRole

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates a test superuser with admin/admin1234 credentials'

    def handle(self, *args, **options):
        username = 'admin'
        email = 'admin@example.com'
        password = 'admin1234'
        
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'User {username} already exists'))
            user = User.objects.get(username=username)
        else:
            user = User.objects.create_superuser(username=username, email=email, password=password)
            self.stdout.write(self.style.SUCCESS(f'Created superuser {username} with password admin1234'))
        
        # Ensure the user is connected to the first organization as an admin
        try:
            org = Organization.objects.first()
            if org:
                # Set the user's organization
                user.organization = org
                user.save()
                
                # Create or get admin role
                admin_role, created = Role.objects.get_or_create(
                    name='Administrator',
                    defaults={
                        'description': 'Full system administrator with all permissions',
                        'organization': org,
                        'role_type': 'system'
                    }
                )
                
                # Assign admin role to user
                UserRole.objects.get_or_create(
                    user=user,
                    role=admin_role,
                    defaults={
                        'is_active': True
                    }
                )
                
                self.stdout.write(self.style.SUCCESS(f'Added {username} as admin to {org.name}'))
            else:
                self.stdout.write(self.style.WARNING('No organizations exist yet. Run generate_dummy_data first.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error connecting user to organization: {str(e)}'))
