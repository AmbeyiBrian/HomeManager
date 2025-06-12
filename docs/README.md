# HomeManager Documentation

This directory contains all documentation for the HomeManager project. Documentation is organized into the following categories:

## Directory Structure

- **api/** - API documentation and implementation details
  - API endpoints documentation
  - QR Code API implementation and development notes

- **development/** - Development guides and practices
  - Git versioning guide
  - Dummy data generation guide

- **features/** - Core feature documentation
  - Backend documentation
  - Frontend documentation

- **mobile/** - Mobile app documentation
  - Mobile app overview
  - QR code manager documentation
  - Property detail fixes
  - Screen documentation

- **organization/** - Organization feature documentation
  - Organization screen improvements
  - Organization name updates
  - Organization filtering implementation
  - Multi-tenant security implementation

- **security/** - Security-related documentation
  - RBAC (Role-Based Access Control) implementation
  - RBAC usage guide
  - Role management implementation
  - Customizable role permissions plan
  - Multi-tenant security implementation

## Project Overview

HomeManager is a comprehensive property management system designed to help landlords, property managers, and organizations efficiently manage their real estate assets, tenants, and related operations. The system prioritizes SMS-based communication with tenants, recognizing that mobile phones are the most reliable way to reach tenants.

The platform is built with multi-organization support at its core - each user belongs to a specific organization and can only access data within their organization's scope. This ensures complete data isolation and security between different property management companies using the system.

## Backend Structure

The backend is built with Django and consists of the following main apps:

### SMS App

Manages all SMS communications with tenants throughout the system. Provides a flexible framework for sending notifications, reminders, and alerts to tenants.

**Models:**
- **SMSTemplate:** Stores reusable message templates for different scenarios
  - Fields: name, template_text, description, created_at, updated_at
- **SMSMessage:** Records sent SMS messages for tracking and reporting
  - Fields: tenant, phone_number, message_content, message_type, sent_at, status, delivery_status, delivery_time
- **SMSProvider:** Configures different SMS gateway providers
  - Fields: organization, provider_name, api_key, sender_id, is_active, created_at

### Maintenance App

Responsible for handling maintenance requests and service provider management.

**Models:**
- **ServiceProvider:** Represents service professionals like plumbers, electricians, etc.
  - Fields: owner, name, provider_type (choices), phone_number, email, address, notes, created_at
- **Ticket:** Tracks maintenance tickets reported by tenants
  - Fields: property, unit, tenant, title, description, status (choices), priority (choices), created_at, updated_at, assigned_to, resolved_at, satisfaction_rating
- **TicketComment:** Stores comments related to maintenance tickets
  - Fields: ticket, author_name, is_owner, comment, created_at

### Notices App

Manages notifications and announcements for tenants.

**Models:**
- **Notice:** Represents notices posted by property owners
  - Fields: property, title, content, notice_type (choices), created_at, start_date, end_date, is_important, is_archived
- **NoticeView:** Tracks which tenants have viewed a notice
  - Fields: notice, tenant, viewed_at

### Organizations App

Implements multi-tenancy support through organization management.

**Models:**
- **Organization:** Central model for multi-tenancy
  - Fields: name, slug, description, primary_owner, email, phone, website, address, subscription_status, trial_enabled, subscription_plan, plan_name, created_at, updated_at
- **OrganizationRole:** Defines roles within an organization
  - Fields: name, slug, role_type (choices), description, permissions (can_manage_users, can_manage_billing, etc.), created_at, updated_at
- **OrganizationMembership:** Links users to organizations with specific roles
  - Fields: id (UUID), organization, user, role, is_active, invitation fields, created_at, updated_at
- **SubscriptionPlan:** Defines available subscription plans
  - Fields: name, slug, description, price_monthly, price_yearly, currency, plan limits, features, support_level, status fields
- **Subscription:** Represents an organization's subscription
  - Fields: organization, plan, status, billing_period, start_date, end_date, trial_end_date, payment references, limit overrides
- **SubscriptionPayment:** Tracks payments for subscriptions
  - Fields: subscription, amount, currency, status, payment_method, transaction details, receipt info

### Payments App

Manages rent payments and integrates with payment providers.

**Models:**
- **RentPayment:** Tracks rent payments from tenants
  - Fields: unit, tenant, amount, due_date, payment_date, status, payment_method, transaction_id, description, receipt_sent, late_fee_applied
- **MpesaPayment:** Handles M-Pesa mobile money transactions
  - Fields: rent_payment, organization, phone_number, amount, reference, description, M-Pesa specific fields, transaction_date, result details

### Properties App

Core functionality for managing properties and rental units.

**Models:**
- **Property:** Represents a physical property
  - Fields: owner, organization, name, address, property_type (choices), description, created_at, updated_at
- **PropertyImage:** Stores images associated with properties
  - Fields: property, image, description, uploaded_at
- **Unit:** Represents individual rental units within a property
  - Fields: property, unit_number, floor, size, bedrooms, bathrooms, monthly_rent, is_occupied, description, access_code
- **QRCode:** Manages QR codes for tenant access and payments
  - Fields: unit, code, created_at, is_active, last_accessed, access_count, payment_enabled
- **MpesaConfig:** M-Pesa configuration for organizations
  - Fields: organization, is_active, is_sandbox, API credentials, callback URLs

### Tenants App

Manages tenant information and lease agreements. Phone number is the primary and essential contact method for all tenants.

**Models:**
- **Tenant:** Stores tenant information
  - Fields: name, phone_number (primary contact method), email (optional), unit, move_in_date, move_out_date, emergency_contact, added_at
- **Lease:** Tracks lease agreements
  - Fields: unit, tenant, start_date, end_date, document, is_active, terms, signed_at

### Users App

Handles user authentication and permissions.

**Models:**
- **User:** Custom user model extending Django's AbstractUser
  - Fields: username, email, phone_number, is_property_owner, is_tenant, organization, plus standard Django user fields

### Analytics App

Provides insights and reporting on property performance, tenant behavior, and financial metrics.

**Models:**
- **Dashboard:** Configures custom analytics dashboards for users
  - Fields: owner, organization, name, description, layout_config, is_default, created_at, updated_at
- **Report:** Defines scheduled and on-demand reports
  - Fields: organization, name, description, report_type, parameters, format, created_at
- **PropertyMetric:** Tracks key performance indicators for properties
  - Fields: property, period_start, period_end, occupancy_rate, revenue, expenses, maintenance_count
- **PaymentAnalytics:** Aggregates payment data for trend analysis
  - Fields: organization, period, total_collected, on_time_percentage, payment_method_breakdown, average_days_late
- **SMSAnalytics:** Monitors SMS communication metrics
  - Fields: organization, period, sms_count, delivery_rate, tenant_response_rate, cost

## Key Features

- Multi-tenant architecture with organization-based isolation
- Subscription and payment management
- Property and unit management
- Tenant and lease tracking
- Maintenance request management
- Mobile money integration (M-Pesa)
- Permission-based access control
- SMS-based communication with tenants

## Technology Stack

- Backend: Django
- Database: PostgreSQL
- API: Django REST Framework
- Payment Integration: M-Pesa, Flutterwave
- SMS Gateway Integration

## Mobile App Features

### Property Management
- Full property and unit listing
- Detailed property views with financial statistics
- Unit management with tenant assignment
- QR code generation for properties and units

### QR Code Manager
The QR Code Manager allows users to:
- Search and filter properties and units
- Select multiple units for batch operations
- Generate professionally formatted PDF documents with QR codes
- Preview QR codes before generating PDFs
- Work in both online and offline modes

QR codes provide tenants with direct access to:
- Tenant portals for each unit
- Maintenance request submissions
- Rent payment interfaces
- Important property information

### Tenant Management
- Comprehensive tenant profiles
- Lease tracking and management
- Rent payment history and status
- Maintenance request submission and tracking
- SMS and push notification communication