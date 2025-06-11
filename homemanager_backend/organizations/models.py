from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify
from django.db.models.query import QuerySet
from django.http import Http404
from django.db.models.deletion import SET_NULL
import uuid
from datetime import timedelta

class OrganizationQuerySet(QuerySet):
    """QuerySet that adds organization filtering capabilities"""
    
    def for_organization(self, organization):
        """Filter queryset to include only items for a specific organization"""
        if organization is None:
            return self.none()
        return self.filter(organization=organization)


class OrganizationManager(models.Manager):
    """Manager that adds organization filtering capabilities"""
    
    def get_queryset(self):
        """Return an OrganizationQuerySet"""
        return OrganizationQuerySet(self.model, using=self._db)
    
    def for_organization(self, organization):
        """Filter queryset to include only items for a specific organization"""
        return self.get_queryset().for_organization(organization)
    
    def get_by_slug_or_404(self, slug):
        """Get an organization by slug or raise 404"""
        try:
            return self.get(slug=slug)
        except self.model.DoesNotExist:
            raise Http404(f"Organization with slug {slug} does not exist")


class OrganizationModel(models.Model):
    """
    Abstract base model for organization-scoped models.
    
    All models that are specific to an organization should inherit from this.
    """
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name="%(class)ss",  # dynamically creates related name
        null=True,
        blank=True
    )
    
    # Use the custom manager
    objects = OrganizationManager()
    
    class Meta:
        abstract = True
        # Index the organization field for faster filtering
        indexes = [
            models.Index(fields=["organization"]),
        ]


class Organization(models.Model):
    """
    Organization model for multi-tenancy support.
    Each user belongs to exactly one organization.
    """
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, blank=True, unique=True)
    description = models.TextField(blank=True, null=True)
    
    # Primary owner/admin of the organization
    primary_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT,  # Prevent deletion of user if they're a primary owner
        related_name='owned_organization',
        null=True,
        blank=True
    )
    
    # Organization contact details
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    website = models.URLField(blank=True, null=True)    
    address = models.TextField(blank=True, null=True)
    
    # Subscription status (for easier filtering without joins)
    subscription_status = models.CharField(
        max_length=20, 
        default='active',
        choices=[
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('trialing', 'Trial'),
            ('past_due', 'Past Due'),
            ('canceled', 'Canceled'),
        ]
    )    
    trial_enabled = models.BooleanField(default=True)
    
    # Foreign key to subscription plan (but still keep plan_name for backwards compatibility)
    subscription_plan = models.ForeignKey(
        'SubscriptionPlan',
        on_delete=SET_NULL,
        related_name='organizations',
        null=True,
        blank=True
    )
    plan_name = models.CharField(max_length=100, blank=True, null=True)
      
    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        """Auto-generate slug from name if not provided and sync plan name"""
        # Generate slug if not provided
        if not self.slug:
            self.slug = self._generate_unique_slug()
        
        # Sync plan_name with subscription_plan for backward compatibility
        if self.subscription_plan and (not self.plan_name or self.plan_name != self.subscription_plan.name):
            self.plan_name = self.subscription_plan.name
            
        super().save(*args, **kwargs)
    
    def _generate_unique_slug(self):
        """Generate a unique slug from the organization name"""
        base_slug = slugify(self.name)
        slug = base_slug
        counter = 1
        
        while Organization.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
            
        return slug
    
    def __str__(self):
        return self.name


class SubscriptionPlan(models.Model):
    """
    Model representing available subscription plans for organizations
    """
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, null=True)
    
    # Pricing
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="KES")
    
    # Plan limits
    max_properties = models.IntegerField(default=0)  # 0 = unlimited
    max_units = models.IntegerField(default=0)       # 0 = unlimited
    max_users = models.IntegerField(default=5)       # Default to 5 users
    
    # Features
    has_tenant_portal = models.BooleanField(default=True)
    has_payment_processing = models.BooleanField(default=True)
    has_maintenance_management = models.BooleanField(default=True)
    has_custom_branding = models.BooleanField(default=False)
    has_api_access = models.BooleanField(default=False)
    support_level = models.CharField(
        max_length=20,
        choices=[
            ('basic', 'Basic'),
            ('standard', 'Standard'),
            ('premium', 'Premium'),
        ],
        default='basic'
    )
    
    # Plan visibility and status
    is_active = models.BooleanField(default=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name


class Subscription(OrganizationModel):
    """
    Model representing an organization's subscription to a plan
    """
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions')
    
    # Subscription status
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('past_due', 'Past Due'),
        ('canceled', 'Canceled'),
        ('trialing', 'Trialing'),
        ('expired', 'Expired'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Billing period
    BILLING_PERIOD_CHOICES = [
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]
    billing_period = models.CharField(max_length=10, choices=BILLING_PERIOD_CHOICES, default='monthly')
    
    # Subscription dates
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    trial_end_date = models.DateTimeField(null=True, blank=True)
    
    # External payment provider references
    stripe_subscription_id = models.CharField(max_length=100, blank=True, null=True)
    mpesa_payment_reference = models.CharField(max_length=100, blank=True, null=True)
    
    # Overrides for plan limits (for custom deals)
    max_properties_override = models.IntegerField(null=True, blank=True)
    max_units_override = models.IntegerField(null=True, blank=True)
    max_users_override = models.IntegerField(null=True, blank=True)
    
    # Subscription metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.organization.name} - {self.plan.name}"


class SubscriptionPayment(OrganizationModel):
    """
    Model representing a payment for a subscription
    """
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")
    
    # Payment status
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Payment methods
    PAYMENT_METHOD_CHOICES = [
        ('mpesa', 'M-PESA'),
        ('stripe', 'Credit Card (Stripe)'),
        ('bank_transfer', 'Bank Transfer'),
        ('manual', 'Manual Entry'),
    ]
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    
    # External payment references
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    payment_date = models.DateTimeField(default=timezone.now)
    
    # For MPESA
    mpesa_receipt = models.CharField(max_length=100, blank=True, null=True)
    mpesa_phone = models.CharField(max_length=20, blank=True, null=True)
    
    # For Stripe
    stripe_charge_id = models.CharField(max_length=100, blank=True, null=True)
    
    # Receipt info
    receipt_number = models.CharField(max_length=50, blank=True, null=True)
    receipt_url = models.URLField(blank=True, null=True)
    
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.subscription.organization.name} - {self.amount} {self.currency}"
