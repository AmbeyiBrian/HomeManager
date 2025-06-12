from django.core.management.base import BaseCommand
from maintenance.models import ServiceProvider
from django.db.models import F

class Command(BaseCommand):
    help = 'Update existing ServiceProvider records to add organization based on owner'

    def handle(self, *args, **options):
        # Get all service providers without an organization
        providers_to_update = ServiceProvider.objects.filter(organization__isnull=True)
        self.stdout.write(f"Found {providers_to_update.count()} ServiceProviders without organization")
        
        # Update providers to use their owner's organization
        updated_count = providers_to_update.update(
            organization=F('owner__organization')
        )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated {updated_count} ServiceProviders')
        )
        
        # Check for any providers that still don't have an organization
        remaining = ServiceProvider.objects.filter(organization__isnull=True).count()
        if remaining > 0:
            self.stdout.write(
                self.style.WARNING(f'{remaining} ServiceProviders still have no organization. This may occur if their owners are not assigned to an organization.')
            )
