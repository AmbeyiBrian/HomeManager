import random
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from faker import Faker

# Import all models
from organizations.models import Organization, SubscriptionPlan, Subscription, SubscriptionPayment
from organizations.membership_models import OrganizationRole, OrganizationMembership
from properties.models import Property, Unit, PropertyImage, QRCode, MpesaConfig
from tenants.models import Tenant, Lease
from maintenance.models import ServiceProvider, Ticket, TicketComment
from notices.models import Notice, NoticeView
from payments.models import RentPayment, MpesaPayment
from sms.models import SMSTemplate, SMSMessage, SMSProvider
from analytics.models import Dashboard, Report, PropertyMetric, PaymentAnalytics, SMSAnalytics

User = get_user_model()
fake = Faker()

class Command(BaseCommand):
    help = 'Generate comprehensive dummy data for all models'

    def add_arguments(self, parser):
        parser.add_argument(
            '--organizations',
            type=int,
            default=10,
            help='Number of organizations to create (default: 10)'
        )
        parser.add_argument(
            '--properties-per-org',
            type=int,
            default=10,
            help='Number of properties per organization (default: 10)'
        )
        parser.add_argument(
            '--min-units',
            type=int,
            default=50,
            help='Minimum units per property (default: 50)'
        )        
        parser.add_argument(
            '--max-units',
            type=int,
            default=500,
            help='Maximum units per property (default: 500)'
        )
        parser.add_argument(
            '--transactions-per-org',
            type=int,
            default=200,
            help='Minimum transactions per organization (default: 200)'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting comprehensive data generation...'))
        
        # Store options
        self.num_organizations = options['organizations']
        self.properties_per_org = options['properties_per_org']
        self.min_units = options['min_units']
        self.max_units = options['max_units']
        self.transactions_per_org = options['transactions_per_org']
        
        with transaction.atomic():
            # Step 0: Clean existing data
            self.clean_existing_data()
            
            # Step 1: Create subscription plans
            self.create_subscription_plans()
            
            # Step 2: Create organization roles
            self.create_organization_roles()
            
            # Step 3: Create organizations with users
            organizations = self.create_organizations()
            
            # Step 4: Create properties and units for each organization
            all_properties, all_units = self.create_properties_and_units(organizations)
            
            # Step 5: Create tenants and leases
            all_tenants, all_leases = self.create_tenants_and_leases(organizations, all_units)
            
            # Step 6: Create service providers and maintenance tickets
            self.create_maintenance_data(organizations, all_properties)
            
            # Step 7: Create notices
            self.create_notices(organizations, all_tenants)
            
            # Step 8: Create payment data
            self.create_payment_data(organizations, all_leases)
            
            # Step 9: Create SMS data
            self.create_sms_data(organizations, all_tenants)
              # Step 10: Create analytics data
            self.create_analytics_data(organizations, all_properties)
            
        self.stdout.write(self.style.SUCCESS('✅ Dummy data generation completed successfully!'))
        self.print_summary()

    def clean_existing_data(self):
        """Clean all existing data in the correct order to avoid foreign key constraint violations"""
        self.stdout.write(self.style.WARNING('🧹 Cleaning existing data...'))
        
        # Delete in reverse order of dependencies to avoid foreign key violations
        # Most dependent models first, least dependent last
        
        # Analytics and reports
        self.stdout.write('  - Deleting analytics data...')
        SMSAnalytics.objects.all().delete()
        PaymentAnalytics.objects.all().delete()
        PropertyMetric.objects.all().delete()
        Report.objects.all().delete()
        Dashboard.objects.all().delete()
        
        # SMS data
        self.stdout.write('  - Deleting SMS data...')
        SMSMessage.objects.all().delete()
        SMSTemplate.objects.all().delete()
        SMSProvider.objects.all().delete()
        
        # Payments
        self.stdout.write('  - Deleting payment data...')
        MpesaPayment.objects.all().delete()
        RentPayment.objects.all().delete()
        
        # Notices
        self.stdout.write('  - Deleting notices...')
        NoticeView.objects.all().delete()
        Notice.objects.all().delete()
        
        # Maintenance
        self.stdout.write('  - Deleting maintenance data...')
        TicketComment.objects.all().delete()
        Ticket.objects.all().delete()
        ServiceProvider.objects.all().delete()
        
        # Tenants and leases
        self.stdout.write('  - Deleting tenant data...')
        Lease.objects.all().delete()
        Tenant.objects.all().delete()
        
        # Properties and units
        self.stdout.write('  - Deleting property data...')
        QRCode.objects.all().delete()
        Unit.objects.all().delete()
        PropertyImage.objects.all().delete()
        Property.objects.all().delete()
        MpesaConfig.objects.all().delete()
        
        # Organizations and memberships
        self.stdout.write('  - Deleting organization data...')
        SubscriptionPayment.objects.all().delete()
        Subscription.objects.all().delete()
        OrganizationMembership.objects.all().delete()
        Organization.objects.all().delete()
        
        # Subscription plans and roles (keep these as they are reference data)
        # Note: We'll recreate these but clean them first for consistency
        self.stdout.write('  - Deleting subscription plans and roles...')
        SubscriptionPlan.objects.all().delete()
        OrganizationRole.objects.all().delete()
        
        # Clean up users except superusers
        self.stdout.write('  - Deleting non-superuser accounts...')
        User.objects.filter(is_superuser=False).delete()
        
        self.stdout.write(self.style.SUCCESS('  ✅ Data cleanup completed!'))

    def create_subscription_plans(self):
        """Create subscription plans"""
        self.stdout.write('Creating subscription plans...')
        
        plans_data = [
            {
                'name': 'Basic',
                'slug': 'basic',
                'description': 'Perfect for small property owners',
                'price_monthly': Decimal('1999.00'),
                'price_yearly': Decimal('19990.00'),
                'max_properties': 5,
                'max_units': 50,
                'max_users': 3,
                'has_custom_branding': False,
                'has_api_access': False,
                'support_level': 'basic'
            },
            {
                'name': 'Professional',
                'slug': 'professional',
                'description': 'Great for growing property managers',
                'price_monthly': Decimal('4999.00'),
                'price_yearly': Decimal('49990.00'),
                'max_properties': 25,
                'max_units': 500,
                'max_users': 10,
                'has_custom_branding': True,
                'has_api_access': False,
                'support_level': 'standard'
            },
            {
                'name': 'Enterprise',
                'slug': 'enterprise',
                'description': 'For large property management companies',
                'price_monthly': Decimal('9999.00'),
                'price_yearly': Decimal('99990.00'),
                'max_properties': 0,  # Unlimited
                'max_units': 0,       # Unlimited
                'max_users': 50,
                'has_custom_branding': True,
                'has_api_access': True,
                'support_level': 'premium'
            }
        ]
        
        for plan_data in plans_data:
            SubscriptionPlan.objects.get_or_create(
                slug=plan_data['slug'],
                defaults=plan_data
            )
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(plans_data)} subscription plans'))

    def create_organization_roles(self):
        """Create organization roles"""
        self.stdout.write('Creating organization roles...')
        
        roles_data = [
            {
                'name': 'Owner',
                'slug': 'owner',
                'role_type': 'owner',
                'description': 'Organization owner with full access',
                'can_manage_users': True,
                'can_manage_billing': True,
                'can_manage_properties': True,
                'can_manage_tenants': True,
                'can_view_reports': True,
            },
            {
                'name': 'Admin',
                'slug': 'admin',
                'role_type': 'admin',
                'description': 'Administrator with most permissions',
                'can_manage_users': True,
                'can_manage_billing': False,
                'can_manage_properties': True,
                'can_manage_tenants': True,
                'can_view_reports': True,
            },
            {
                'name': 'Property Manager',
                'slug': 'property-manager',
                'role_type': 'member',
                'description': 'Manages properties and tenants',
                'can_manage_users': False,
                'can_manage_billing': False,
                'can_manage_properties': True,
                'can_manage_tenants': True,
                'can_view_reports': True,
            },
            {
                'name': 'Tenant Coordinator',
                'slug': 'tenant-coordinator',
                'role_type': 'member',
                'description': 'Manages tenant relationships',
                'can_manage_users': False,
                'can_manage_billing': False,
                'can_manage_properties': False,
                'can_manage_tenants': True,
                'can_view_reports': False,
            },
            {
                'name': 'Viewer',
                'slug': 'viewer',
                'role_type': 'guest',
                'description': 'Read-only access',
                'can_manage_users': False,
                'can_manage_billing': False,
                'can_manage_properties': False,
                'can_manage_tenants': False,
                'can_view_reports': True,
            }
        ]
        
        for role_data in roles_data:
            OrganizationRole.objects.get_or_create(
                slug=role_data['slug'],
                defaults=role_data
            )
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(roles_data)} organization roles'))

    def create_organizations(self):
        """Create organizations with users and subscriptions"""
        self.stdout.write(f'Creating {self.num_organizations} organizations...')
        
        organizations = []
        subscription_plans = list(SubscriptionPlan.objects.all())
        owner_role = OrganizationRole.objects.get(slug='owner')
        admin_role = OrganizationRole.objects.get(slug='admin')
        manager_role = OrganizationRole.objects.get(slug='property-manager')
        
        for i in range(self.num_organizations):
            # Create organization
            org_name = f"{fake.company()} Properties"
            org = Organization.objects.create(
                name=org_name,
                description=fake.text(max_nb_chars=200),
                email=fake.company_email(),
                phone=fake.phone_number()[:20],
                website=fake.url(),
                address=fake.address(),
                subscription_status='active',
                trial_enabled=random.choice([True, False]),
                subscription_plan=random.choice(subscription_plans)
            )
            
            # Create primary owner
            owner_username = f"owner_{i+1}"
            owner = User.objects.create_user(
                username=owner_username,
                email=f"owner_{i+1}@{org.name.lower().replace(' ', '').replace('properties', '')}.com",
                password='1234',
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                phone_number=fake.phone_number()[:15],
                is_property_owner=True,
                organization=org
            )
            
            # Set as primary owner
            org.primary_owner = owner
            org.save()
            
            # Create membership for owner
            OrganizationMembership.objects.create(
                user=owner,
                organization=org,
                role=owner_role,
                is_active=True,
                is_invited=False
            )
            
            # Create additional users (2-5 per organization)
            num_additional_users = random.randint(2, 5)
            for j in range(num_additional_users):
                user = User.objects.create_user(
                    username=f"user_{i+1}_{j+1}",
                    email=f"user_{i+1}_{j+1}@{org.name.lower().replace(' ', '').replace('properties', '')}.com",
                    password='1234',
                    first_name=fake.first_name(),
                    last_name=fake.last_name(),
                    phone_number=fake.phone_number()[:15],
                    is_property_owner=j == 0,  # First additional user is admin
                    organization=org
                )
                  # Assign role
                role = admin_role if j == 0 else random.choice([manager_role, admin_role])
                OrganizationMembership.objects.create(
                    user=user,
                    organization=org,
                    role=role,
                    is_active=True,
                    is_invited=False
                )
            
            # Create M-Pesa configuration for organization
            MpesaConfig.objects.create(
                organization=org,
                business_short_code=f"{random.randint(100000, 999999)}",
                passkey=uuid.uuid4().hex,
                consumer_key=uuid.uuid4().hex,
                consumer_secret=uuid.uuid4().hex,
                is_active=True
            )
            
            # Create subscription
            subscription = Subscription.objects.create(
                organization=org,
                plan=org.subscription_plan,
                status='active',
                billing_period=random.choice(['monthly', 'yearly']),
                start_date=timezone.now() - timedelta(days=random.randint(30, 365)),
                trial_end_date=timezone.now() + timedelta(days=30) if org.trial_enabled else None
            )
            
            # Create subscription payments (1-12 payments)
            num_payments = random.randint(1, 12)
            for k in range(num_payments):
                payment_date = subscription.start_date + timedelta(days=k*30)
                amount = subscription.plan.price_monthly if subscription.billing_period == 'monthly' else subscription.plan.price_yearly
                
                SubscriptionPayment.objects.create(
                    organization=org,
                    subscription=subscription,
                    amount=amount,
                    currency='KES',
                    status='completed',
                    payment_method=random.choice(['mpesa', 'stripe', 'bank_transfer']),
                    payment_date=payment_date,
                    transaction_id=f"TXN_{uuid.uuid4().hex[:10].upper()}",
                    mpesa_receipt=f"MPE{random.randint(1000000, 9999999)}" if random.choice([True, False]) else None,
                    receipt_number=f"RCT_{uuid.uuid4().hex[:8].upper()}"
                )
            
            organizations.append(org)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(organizations)} organizations with users and subscriptions'))
        return organizations

    def create_properties_and_units(self, organizations):
        """Create properties and units for each organization"""
        self.stdout.write(f'Creating properties and units...')
        
        all_properties = []
        all_units = []
        
        property_types = ['Apartment Complex', 'Office Building', 'Shopping Mall', 'Residential Estate', 'Commercial Plaza']
        unit_types = ['1BR', '2BR', '3BR', '4BR', 'Studio', 'Office', 'Shop', 'Warehouse']
        
        for org in organizations:
            for i in range(self.properties_per_org):                # Create property
                property_obj = Property.objects.create(
                    owner=random.choice(User.objects.filter(organization=org)),
                    organization=org,
                    name=f"{fake.street_name()} {random.choice(property_types)}",
                    address=fake.address(),
                    property_type=random.choice(['residential', 'commercial', 'short_term']),  # Use actual choices
                    description=fake.text(max_nb_chars=300)
                )                # Create property images (1-5 per property)
                num_images = random.randint(1, 5)
                for j in range(num_images):
                    PropertyImage.objects.create(
                        property=property_obj,
                        image=f"properties/property_{property_obj.id}/image_{j+1}.jpg",
                        description=f"Property view {j+1}"
                    )
                
                # Create units for this property (50-500 units as specified)
                units_to_create = random.randint(self.min_units, self.max_units)
                for k in range(units_to_create):
                    unit_number = f"{chr(65 + (k // 100))}{(k % 100) + 1:02d}"  # A01, A02, ..., B01, etc.
                      # Generate unique access code
                    access_code = f"{fake.lexify(text='????', letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ')}-{fake.numerify(text='####')}"
                    
                    unit = Unit.objects.create(
                        property=property_obj,
                        unit_number=unit_number,
                        floor=str(random.randint(1, 20)) if random.choice([True, False]) else None,
                        size=Decimal(str(random.randint(400, 2000))) if random.choice([True, False]) else None,
                        bedrooms=random.randint(0, 4) if random.choice([True, False]) else None,
                        bathrooms=Decimal(str(random.choice([1, 1.5, 2, 2.5, 3]))),
                        monthly_rent=Decimal(str(random.randint(15000, 80000))),
                        is_occupied=random.choice([True, False]),
                        description=fake.text(max_nb_chars=200),
                        access_code=access_code
                    )
                      # Create QR code for unit
                    qr_code = f"{fake.lexify(text='??????????', letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}"
                    QRCode.objects.create(
                        unit=unit,
                        code=qr_code,
                        is_active=True,
                        payment_enabled=True,
                        access_count=random.randint(0, 50)
                    )
                    
                    all_units.append(unit)
                
                # Add property to list after creating all units
                all_properties.append(property_obj)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(all_properties)} properties with {len(all_units)} units'))
        return all_properties, all_units

    def create_tenants_and_leases(self, organizations, all_units):
        """Create tenants and leases"""
        self.stdout.write('Creating tenants and leases...')
        
        all_tenants = []
        all_leases = []
          # Get occupied units
        occupied_units = [unit for unit in all_units if unit.is_occupied]
        
        for unit in occupied_units:
            # Create tenant
            tenant = Tenant.objects.create(
                name=fake.name(),
                phone_number=fake.phone_number()[:15],
                email=fake.email() if random.choice([True, False]) else None,
                unit=unit,
                move_in_date=fake.date_between(start_date='-2y', end_date='today'),
                emergency_contact=fake.name() if random.choice([True, False]) else None
            )
            all_tenants.append(tenant)
            
            # Create lease
            lease_start = tenant.move_in_date
            lease_end = lease_start + timedelta(days=random.randint(365, 1095))  # 1-3 years
            
            lease = Lease.objects.create(
                unit=unit,
                tenant=tenant,
                start_date=lease_start,
                end_date=lease_end,
                terms=fake.text(max_nb_chars=500),
                is_active=True
            )
            all_leases.append(lease)
              # Skip lease documents (LeaseDocument model doesn't exist in current schema)
            # Documents are handled directly in the Lease model with the 'document' field
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(all_tenants)} tenants with {len(all_leases)} leases'))
        return all_tenants, all_leases

    def create_maintenance_data(self, organizations, all_properties):
        """Create service providers and maintenance tickets"""
        self.stdout.write('Creating maintenance data...')
        
        service_categories = ['Plumbing', 'Electrical', 'HVAC', 'Cleaning', 'Security', 'Landscaping', 'General Repair']
        
        total_tickets = 0
        
        for org in organizations:
            # Create service providers (3-6 per organization)
            num_providers = random.randint(3, 6)
            service_providers = []
            
            for i in range(num_providers):
                provider = ServiceProvider.objects.create(
                    owner=random.choice(User.objects.filter(organization=org)),
                    name=fake.company(),
                    provider_type=random.choice(['plumber', 'electrician', 'carpenter', 'cleaner', 'painter', 'general', 'other']),
                    phone_number=fake.phone_number()[:15],
                    email=fake.email(),
                    address=fake.address(),
                    notes=fake.text(max_nb_chars=200)
                )                
                
                service_providers.append(provider)
            
            # Create maintenance tickets for this organization's properties
            org_properties = [p for p in all_properties if p.organization == org]
            
            for property_obj in org_properties:
                # Only create tickets for properties that have units with tenants
                occupied_units = [unit for unit in property_obj.units.all() if unit.is_occupied and unit.tenants.exists()]
                
                if not occupied_units:
                    continue  # Skip this property if no occupied units with tenants
                
                # Create 5-20 tickets per property
                num_tickets = random.randint(5, 20)
                
                for j in range(num_tickets):
                    # Select a random occupied unit with tenants
                    selected_unit = random.choice(occupied_units)
                    selected_tenant = random.choice(selected_unit.tenants.all())
                    
                    created_date = fake.date_time_between(
                        start_date='-1y',
                        end_date='now',
                        tzinfo=timezone.get_current_timezone()
                    )
                    
                    ticket = Ticket.objects.create(
                        property=property_obj,
                        unit=selected_unit,
                        tenant=selected_tenant,
                        title=fake.sentence(nb_words=4),
                        description=fake.text(max_nb_chars=300),
                        priority=random.choice(['low', 'medium', 'high', 'urgent']),
                        status=random.choice(['new', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed']),
                        assigned_to=random.choice(service_providers) if random.choice([True, False]) else None,
                        created_at=created_date,
                        updated_at=created_date
                    )
                    
                    # Create ticket comments (1-5 per ticket)
                    num_comments = random.randint(1, 5)
                    for k in range(num_comments):
                        comment_date = created_date + timedelta(days=random.randint(1, 30))
                        TicketComment.objects.create(
                            ticket=ticket,
                            author_name=fake.name(),
                            is_owner=random.choice([True, False]),
                            comment=fake.text(max_nb_chars=200),
                            created_at=comment_date
                        )
                    
                    total_tickets += 1
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created maintenance data with {total_tickets} tickets'))

    def create_notices(self, organizations, all_tenants):
        """Create notices and notice views"""
        self.stdout.write('Creating notices...')
        
        notice_types = ['general', 'rent', 'maintenance', 'inspection', 'eviction']  # Use actual choices
        total_notices = 0
        
        for org in organizations:
            org_tenants = [t for t in all_tenants if t.unit.property.organization == org]
            org_properties = [t.unit.property for t in org_tenants]
            org_properties = list(set(org_properties))  # Remove duplicates
            
            if not org_properties:
                continue  # Skip if no properties for this organization
            
            # Create 10-25 notices per organization
            num_notices = random.randint(10, 25)
            
            for i in range(num_notices):
                # Select a random property from this organization
                selected_property = random.choice(org_properties)
                
                # Create start and end dates
                start_date = fake.date_between(start_date='-6m', end_date='today')
                end_date = fake.date_between(start_date=start_date, end_date=start_date + timedelta(days=180))
                
                notice = Notice.objects.create(
                    property=selected_property,
                    title=fake.sentence(nb_words=6),
                    content=fake.text(max_nb_chars=800),
                    notice_type=random.choice(notice_types),
                    start_date=start_date,
                    end_date=end_date,
                    is_important=random.choice([True, False]),
                    is_archived=False
                )
                
                # Create notice views (some tenants view the notice)
                # Only tenants from the same property can view the notice
                property_tenants = [t for t in org_tenants if t.unit.property == selected_property]
                if property_tenants:
                    viewing_tenants = random.sample(
                        property_tenants, 
                        k=random.randint(1, min(len(property_tenants), max(1, len(property_tenants)//2)))
                    )
                    for tenant in viewing_tenants:
                        view_date = fake.date_time_between(
                            start_date=start_date,
                            end_date='now',
                            tzinfo=timezone.get_current_timezone()
                        )
                        NoticeView.objects.create(
                            notice=notice,
                            tenant=tenant,
                            viewed_at=view_date
                        )
                
                total_notices += 1
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {total_notices} notices with views'))

    def create_payment_data(self, organizations, all_leases):
        """Create payment data"""
        self.stdout.write('Creating payment data...')
        
        total_payments = 0
        total_reminders = 0
        
        for org in organizations:
            org_leases = [l for l in all_leases if l.unit.property.organization == org]
            org_transactions = 0
            
            for lease in org_leases:
                # Create monthly rent payments
                current_date = lease.start_date
                end_date = min(lease.end_date, timezone.now().date())
                
                while current_date <= end_date:
                    # 80% chance of payment being made
                    if random.random() < 0.8:
                        payment_date = current_date + timedelta(days=random.randint(0, 10))
                        
                        payment = RentPayment.objects.create(
                            unit=lease.unit,
                            tenant=lease.tenant,
                            amount=lease.unit.monthly_rent + Decimal(str(random.randint(-2000, 2000))),  # Some variation
                            due_date=current_date,
                            payment_date=payment_date,
                            payment_method=random.choice(['m_pesa', 'bank', 'cash', 'other']),
                            status='completed',
                            transaction_id=f"PAY_{uuid.uuid4().hex[:8].upper()}",
                            description=fake.text(max_nb_chars=100) if random.choice([True, False]) else None
                        )
                        # Create M-Pesa transaction for M-Pesa payments
                        if payment.payment_method == 'm_pesa':
                            MpesaPayment.objects.create(
                                organization=org,
                                rent_payment=payment,
                                phone_number=lease.tenant.phone_number,
                                amount=payment.amount,
                                reference=payment.transaction_id,
                                description=f"Rent payment for {lease.unit}",
                                mpesa_receipt_number=f"MPE{random.randint(1000000, 9999999)}",
                                transaction_date=payment_date,
                                result_code='0',
                                result_description='Success',
                                merchant_request_id=uuid.uuid4().hex,
                                checkout_request_id=uuid.uuid4().hex
                            )
                        
                        total_payments += 1
                        org_transactions += 1
                    
                    else:
                        # Skip creating payment reminder for missed payment
                        # (PaymentReminder model doesn't exist in current schema)
                        total_reminders += 1                    # Move to next month using a safer method with timedelta
                    # Add approximately 30 days and then set to first of next month
                    temp_date = current_date + timedelta(days=32)  # Ensure we get to next month
                    current_date = temp_date.replace(day=1)  # Set to first day of that month
              # Ensure minimum transactions per organization
            additional_needed = max(0, self.transactions_per_org - org_transactions)
            for i in range(additional_needed):
                lease = random.choice(org_leases)
                payment_date = fake.date_between(start_date='-1y', end_date='today')
                
                payment = RentPayment.objects.create(
                    unit=lease.unit,
                    tenant=lease.tenant,
                    amount=lease.unit.monthly_rent,
                    due_date=payment_date,
                    payment_date=payment_date,
                    payment_method=random.choice(['m_pesa', 'bank', 'cash']),
                    status='completed',
                    transaction_id=f"PAY_{uuid.uuid4().hex[:8].upper()}",
                    description='Additional transaction for minimum requirement'
                )
                total_payments += 1
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {total_payments} payments and {total_reminders} reminders'))

    def create_sms_data(self, organizations, all_tenants):
        """Create SMS data"""
        self.stdout.write('Creating SMS data...')
        
        total_templates = 0
        total_messages = 0
        
        # Template data
        template_data = [
            {
                'name': 'Rent Reminder',
                'template_text': 'Dear {tenant_name}, your rent payment of KES {amount} is due on {due_date}. Please pay on time to avoid penalties.',
                'description': 'Template for rent payment reminders'
            },
            {
                'name': 'Payment Confirmation',
                'template_text': 'Thank you {tenant_name}! We have received your rent payment of KES {amount} for {property_name}. Receipt: {receipt_number}',
                'description': 'Template for payment confirmations'
            },
            {
                'name': 'Maintenance Notice',
                'template_text': 'Dear {tenant_name}, scheduled maintenance will be conducted in your unit on {date}. Please ensure access. Contact us for any concerns.',
                'description': 'Template for maintenance notifications'
            },
            {
                'name': 'Welcome Message',
                'template_text': 'Welcome to {property_name}, {tenant_name}! We are excited to have you as our tenant. For any assistance, contact us at {contact_number}.',
                'description': 'Template for welcoming new tenants'
            }
        ]
        
        for org in organizations:
            # Create SMS provider
            SMSProvider.objects.create(
                organization=org,
                provider_name='Safaricom SMS Gateway',
                api_key=uuid.uuid4().hex,
                sender_id='PROPMANAGER',
                is_active=True
            )
            
            # Create SMS templates
            for template_info in template_data:
                template = SMSTemplate.objects.create(
                    organization=org,
                    name=template_info['name'],
                    template_text=template_info['template_text'],
                    description=template_info['description']
                )
                total_templates += 1
              # Create SMS messages
            org_tenants = [t for t in all_tenants if t.unit.property.organization == org]
            
            # Create 50-150 SMS messages per organization
            num_messages = random.randint(50, 150)
            
            for i in range(num_messages):
                tenant = random.choice(org_tenants)
                sent_date = fake.date_time_between(
                    start_date='-6m',
                    end_date='now',
                    tzinfo=timezone.get_current_timezone()
                )
                
                message_types = ['rent_reminder', 'payment_confirmation', 'maintenance_notice', 'general']
                
                SMSMessage.objects.create(
                    tenant=tenant,
                    phone_number=tenant.phone_number,
                    message_content=fake.text(max_nb_chars=160),
                    message_type=random.choice(message_types),
                    sent_at=sent_date,
                    status='sent',
                    delivery_status=random.choice(['delivered', 'failed', 'pending']),
                    delivery_time=sent_date + timedelta(seconds=random.randint(1, 30))
                )
                total_messages += 1
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {total_templates} SMS templates and {total_messages} messages'))

    def create_analytics_data(self, organizations, all_properties):
        """Create analytics data"""
        self.stdout.write('Creating analytics data...')
        
        total_dashboards = 0
        total_reports = 0
        total_metrics = 0
        
        for org in organizations:
            org_users = User.objects.filter(organization=org)
            org_properties = [p for p in all_properties if p.organization == org]
            
            # Create dashboards (1-3 per organization)
            num_dashboards = random.randint(1, 3)
            for i in range(num_dashboards):
                owner = random.choice(org_users)
                Dashboard.objects.create(
                    owner=owner,
                    organization=org,
                    name=f"Dashboard {i+1} - {org.name}",
                    description=fake.text(max_nb_chars=200),
                    layout_config={
                        'widgets': [
                            {'type': 'occupancy_rate', 'position': {'x': 0, 'y': 0}},
                            {'type': 'revenue_chart', 'position': {'x': 1, 'y': 0}},
                            {'type': 'maintenance_summary', 'position': {'x': 0, 'y': 1}},
                        ]
                    },
                    is_default=i == 0
                )
                total_dashboards += 1
            
            # Create reports (2-5 per organization)
            num_reports = random.randint(2, 5)
            report_types = ['occupancy', 'financials', 'rent_collection', 'maintenance', 'tenant']
            
            for i in range(num_reports):
                Report.objects.create(
                    organization=org,
                    name=f"{random.choice(report_types).title()} Report {i+1}",
                    description=fake.text(max_nb_chars=150),
                    report_type=random.choice(report_types),
                    parameters={
                        'date_range': '3months',
                        'properties': [p.id for p in random.sample(org_properties, k=min(3, len(org_properties)))],
                        'include_charts': True
                    },
                    format=random.choice(['pdf', 'csv', 'excel'])
                )
                total_reports += 1
              # Create property metrics
            for property_obj in org_properties:
                # Create metrics for last 12 months
                for month_offset in range(12):
                    period_start = timezone.now().date().replace(day=1) - timedelta(days=30 * month_offset)
                    period_end = (period_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
                    
                    metric, created = PropertyMetric.objects.get_or_create(
                        property=property_obj,
                        period_start=period_start,
                        period_end=period_end,
                        defaults={
                            'occupancy_rate': Decimal(str(random.uniform(75.0, 95.0))),
                            'revenue': Decimal(str(random.randint(500000, 2000000))),
                            'expenses': Decimal(str(random.randint(100000, 500000))),
                            'maintenance_count': random.randint(5, 25)
                        }
                    )
                    if created:
                        total_metrics += 1
              # Create payment analytics (last 12 months)
            for month_offset in range(12):
                date = timezone.now().date() - timedelta(days=30 * month_offset)
                period = date.strftime('%Y-%m')
                
                PaymentAnalytics.objects.get_or_create(
                    organization=org,
                    period=period,
                    defaults={
                        'total_collected': Decimal(str(random.randint(1000000, 5000000))),
                        'on_time_percentage': Decimal(str(random.uniform(70.0, 95.0))),
                        'payment_method_breakdown': {
                            'mpesa': random.uniform(40.0, 60.0),
                            'bank_transfer': random.uniform(25.0, 35.0),
                            'cash': random.uniform(10.0, 20.0),
                            'cheque': random.uniform(5.0, 15.0)
                        },
                        'average_days_late': Decimal(str(random.uniform(2.0, 8.0)))
                    }
                )
            
            # Create SMS analytics (last 12 months)
            for month_offset in range(12):
                date = timezone.now().date() - timedelta(days=30 * month_offset)
                period = date.strftime('%Y-%m')
                
                SMSAnalytics.objects.get_or_create(
                    organization=org,
                    period=period,
                    defaults={
                        'sms_count': random.randint(100, 500),
                        'delivery_rate': Decimal(str(random.uniform(85.0, 98.0))),
                        'tenant_response_rate': Decimal(str(random.uniform(15.0, 40.0))),
                        'cost': Decimal(str(random.uniform(5000.0, 15000.0)))
                    }
                )
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {total_dashboards} dashboards, {total_reports} reports, and {total_metrics} property metrics'))

    def print_summary(self):
        """Print summary of created data"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('📊 DATA GENERATION SUMMARY'))
        self.stdout.write('='*60)
        
        # Count all created objects
        counts = {
            'Organizations': Organization.objects.count(),
            'Users': User.objects.count(),
            'Subscription Plans': SubscriptionPlan.objects.count(),
            'Subscriptions': Subscription.objects.count(),
            'Properties': Property.objects.count(),
            'Units': Unit.objects.count(),
            'Tenants': Tenant.objects.count(),
            'Leases': Lease.objects.count(),
            'Maintenance Tickets': Ticket.objects.count(),
            'Service Providers': ServiceProvider.objects.count(),            'Notices': Notice.objects.count(),
            'Rent Payments': RentPayment.objects.count(),
            'M-Pesa Payments': MpesaPayment.objects.count(),
            'SMS Messages': SMSMessage.objects.count(),
            'SMS Templates': SMSTemplate.objects.count(),
            'Dashboards': Dashboard.objects.count(),
            'Reports': Report.objects.count(),
            'Property Metrics': PropertyMetric.objects.count(),
        }
        
        for model, count in counts.items():
            self.stdout.write(f'{model:<25}: {count:>10,}')
        
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('🎉 All dummy data has been created successfully!'))
        self.stdout.write('📝 Default password for all users: 1234')
        self.stdout.write('='*60)
