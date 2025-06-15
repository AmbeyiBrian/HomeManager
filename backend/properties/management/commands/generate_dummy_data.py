import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from faker import Faker
import uuid

# Import models from all apps
from organizations.models import Organization
from properties.models import Property, Unit, QRCode, PropertyImage, MpesaConfig
from tenants.models import Tenant, Lease
from payments.models import RentPayment, MpesaPayment
from maintenance.models import ServiceProvider, Ticket, TicketComment
from notices.models import Notice, NoticeView

User = get_user_model()
fake = Faker()

PROPERTY_TYPES = ['residential', 'commercial', 'short_term']
FLOOR_OPTIONS = ['G', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
PAYMENT_STATUSES = ['pending', 'initiated', 'processing', 'completed', 'failed']
PAYMENT_METHODS = ['m_pesa', 'card', 'bank', 'cash', 'other']
TICKET_STATUSES = ['new', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed']
TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent']
PROVIDER_TYPES = ['plumber', 'electrician', 'carpenter', 'cleaner', 'painter', 'general', 'other']

class Command(BaseCommand):
    help = 'Generate comprehensive dummy data for all models'

    def add_arguments(self, parser):
        parser.add_argument('--orgs', type=int, default=5, help='Number of organizations to create')
        parser.add_argument('--properties', type=int, default=10, help='Number of properties per organization')
        parser.add_argument('--units', type=int, default=20, help='Number of units per property')
        parser.add_argument('--tenants', type=int, default=5, help='Number of tenants per property')
        parser.add_argument('--payments', type=int, default=10, help='Number of payments per tenant')
        parser.add_argument('--tickets', type=int, default=5, help='Number of maintenance tickets per property')    
    
    def handle(self, *args, **options):
        num_orgs = min(options['orgs'], 5)  # Maximum 5 organizations
        num_properties = min(options['properties'], 10)  # Maximum 10 properties per org
        num_units = min(options['units'], 200)  # Maximum 200 units per property
        num_tenants = min(options['tenants'], 5)  # Maximum 5 tenants per property
        num_payments = min(options['payments'], 10)  # Maximum 10 payments per tenant
        num_tickets = min(options['tickets'], 5)  # Maximum 5 tickets per property

        self.stdout.write(self.style.SUCCESS(f'Creating {num_orgs} organizations with:'))
        self.stdout.write(self.style.SUCCESS(f'- {num_properties} properties each'))
        self.stdout.write(self.style.SUCCESS(f'- Up to {num_units} units per property'))
        self.stdout.write(self.style.SUCCESS(f'- Up to {num_tenants} tenants per property'))
        self.stdout.write(self.style.SUCCESS(f'- Up to {num_payments} payments per tenant'))
        self.stdout.write(self.style.SUCCESS(f'- Up to {num_tickets} maintenance tickets per property'))
        
        # Create some test users
        users = self.create_users()
        
        # Create organizations
        orgs = self.create_organizations(users, num_orgs)
        
        # Create service providers
        providers = self.create_service_providers(users[0], num_orgs * 2)
        
        # Create properties for each organization
        for org in orgs:
            self.create_properties(org, users[0], num_properties, num_units)
            self.stdout.write(self.style.SUCCESS('Successfully created dummy data'))
        
    def create_users(self):
        self.stdout.write('Creating test users...')
        users = []
        
        # Create 5 test users
        for i in range(1, 6):
            username = f'testuser{i}'
            email = f'user{i}@example.com'
            
            # Check if user already exists
            if User.objects.filter(username=username).exists():
                user = User.objects.get(username=username)
                self.stdout.write(f'  User {username} already exists')
            else:
                # Keep first and last names reasonably short
                first_name = fake.first_name()[:30]
                last_name = fake.last_name()[:30]
                
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password='1234',
                    first_name=first_name,
                    last_name=last_name
                )
                self.stdout.write(f'  Created user {username}')
            
            users.append(user)
        
        return users

    def create_organizations(self, users, num_orgs):
        self.stdout.write('Creating organizations...')
        orgs = []
        
        primary_owner = users[0]  # First user is the primary owner
        
        for i in range(1, num_orgs + 1):            # Keep organization name reasonably short
            org_name = f"{fake.company()[:15]} {fake.company_suffix()}"[:50]
            
            # Check if organization already exists
            if Organization.objects.filter(name=org_name).exists():
                org = Organization.objects.get(name=org_name)
                self.stdout.write(f'  Organization {org_name} already exists')
            else:
                # Format phone number to ensure it's within the 20-char limit
                phone_num = fake.numerify(text="###-###-####")
                
                # Create a valid domain name from the company name
                domain_name = ''.join(c for c in org_name.lower() if c.isalnum())[:20]
                
                org = Organization.objects.create(
                    name=org_name,
                    description=fake.catch_phrase()[:100],
                    primary_owner=primary_owner,
                    email=f"info@{domain_name}.com",
                    phone=phone_num,
                    website=f"http://www.{domain_name}.com",
                    address=fake.address()[:100]
                )
                  # No need to add additional owners as we don't have this field
                self.stdout.write(f'  Created organization: {org_name}')
            
            orgs.append(org)
        
        return orgs

    def create_service_providers(self, owner, num_providers):
        self.stdout.write('Creating service providers...')
        providers = []
        
        for i in range(num_providers):
            provider_type = random.choice(PROVIDER_TYPES)
            name = f"{fake.company()} {provider_type.title()} Services"
            
            # Check if provider already exists
            if ServiceProvider.objects.filter(name=name).exists():
                provider = ServiceProvider.objects.get(name=name)
                self.stdout.write(f'  Service provider {name} already exists')
            else:
                provider = ServiceProvider.objects.create(
                    name=name,
                    contact_person=fake.name(),
                    phone=fake.phone_number()[:20],
                    email=fake.email(),
                    address=fake.address()[:100],
                    provider_type=provider_type,
                    hourly_rate=random.randint(1000, 5000),
                    owner=owner
                )
                self.stdout.write(f'  Created service provider: {name}')
            
            providers.append(provider)
        
        return providers

    def create_properties(self, organization, owner, num_properties, num_units):
        self.stdout.write(f'Creating properties for {organization.name}...')
        
        for i in range(1, num_properties + 1):            # Keep property name reasonably short
            property_name = f"{organization.name[:20]} {fake.word().title()[:10]}"[:50]
            property_type = random.choice(PROPERTY_TYPES)
            
            # Check if property already exists
            if Property.objects.filter(name=property_name, owner=owner).exists():
                prop = Property.objects.get(name=property_name, owner=owner)
                self.stdout.write(f'  Property {property_name} already exists')
            else:
                prop = Property.objects.create(
                    name=property_name,
                    address=fake.address()[:100],
                    property_type=property_type,
                    description=fake.paragraph()[:200],
                    owner=owner,
                    organization=organization
                )
                self.stdout.write(f'  Created property: {property_name}')
            
            # Create units for this property
            self.create_units(prop, num_units)
    
    def create_units(self, property_obj, num_units):
        self.stdout.write(f'Creating units for {property_obj.name}...')
        
        # For residential properties, create apartments
        if property_obj.property_type == 'residential':
            # Determine how many floors the building has
            max_floors = min(random.randint(1, 10), 10)
            
            # Create fewer units than requested for realism
            actual_units = min(num_units, max_floors * 10)
            
            for i in range(1, actual_units + 1):
                floor = random.choice(FLOOR_OPTIONS[:max_floors])
                unit_num = f"{floor}{random.randint(1, 20):02d}"
                
                # Check if unit already exists
                if Unit.objects.filter(property=property_obj, unit_number=unit_num).exists():
                    self.stdout.write(f'  Unit {unit_num} already exists')
                    continue
                Unit.objects.create(
                    property=property_obj,
                    unit_number=unit_num,
                    floor=floor,
                    size=random.uniform(30, 150),
                    bedrooms=random.randint(0, 3),
                    bathrooms=random.randint(1, 3),
                    monthly_rent=random.randint(10000, 100000),
                    description=fake.paragraph()[:200]
                )
                
                if i % 50 == 0:
                    self.stdout.write(f'  Created {i} units so far...')
        
        # For commercial properties, create offices
        elif property_obj.property_type == 'commercial':
            # Determine how many floors the building has
            max_floors = min(random.randint(1, 20), 10)
            
            # Create fewer units than requested for realism
            actual_units = min(num_units, max_floors * 5)
            
            for i in range(1, actual_units + 1):
                floor = random.choice(FLOOR_OPTIONS[:max_floors])
                unit_num = f"Office-{floor}{random.randint(1, 10)}"
                
                # Check if unit already exists
                if Unit.objects.filter(property=property_obj, unit_number=unit_num).exists():
                    self.stdout.write(f'  Unit {unit_num} already exists')
                    continue
                Unit.objects.create(
                    property=property_obj,
                    unit_number=unit_num,
                    floor=floor,
                    size=random.uniform(50, 500),
                    bedrooms=0,
                    bathrooms=random.randint(1, 2),
                    monthly_rent=random.randint(20000, 200000),
                    description=fake.paragraph()[:200]
                )
                
                if i % 50 == 0:
                    self.stdout.write(f'  Created {i} units so far...')
        
        # For short-term rentals
        else:
            # Create fewer units than requested for realism
            actual_units = min(num_units, 50)
            
            for i in range(1, actual_units + 1):
                unit_num = f"Room-{random.randint(100, 999)}"
                
                # Check if unit already exists
                if Unit.objects.filter(property=property_obj, unit_number=unit_num).exists():
                    self.stdout.write(f'  Unit {unit_num} already exists')
                    continue
                Unit.objects.create(
                    property=property_obj,
                    unit_number=unit_num,
                    floor=random.choice(FLOOR_OPTIONS[:3]),
                    size=random.uniform(20, 100),
                    bedrooms=random.randint(0, 2),
                    bathrooms=1,
                    monthly_rent=random.randint(5000, 50000),
                    description=fake.paragraph()[:200]
                )
                
                if i % 50 == 0:
                    self.stdout.write(f'  Created {i} units so far...')
                    
        self.stdout.write(f'  Completed creating units for {property_obj.name}')
