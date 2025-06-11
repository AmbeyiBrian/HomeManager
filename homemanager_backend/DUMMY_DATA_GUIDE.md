# Dummy Data Generation

## Overview

The `generate_dummy_data` management command creates comprehensive test data for the HomeManager property management system. It generates realistic data across all models in the system.

## Quick Start

### Using the Batch File (Windows)
```bash
cd homemanager_backend
generate_dummy_data.bat
```

### Using Django Management Command Directly
```bash
cd homemanager_backend
pip install faker  # Install required dependency
python manage.py generate_dummy_data
```

## Default Data Generation

By default, the command creates:
- **10 organizations** with subscription plans and users
- **10 properties per organization** (100 total properties)
- **50-500 units per property** (randomly distributed)
- **At least 200 transactions per organization**
- **Realistic tenants, leases, and occupancy data**
- **Maintenance tickets and service providers**
- **Notices and notice views**
- **Payment history with M-Pesa transactions**
- **SMS templates and message history**
- **Analytics dashboards and reports**

## Customization Options

You can customize the data generation using command-line arguments:

```bash
python manage.py generate_dummy_data \
    --organizations 5 \
    --properties-per-org 20 \
    --min-units 100 \
    --max-units 300 \
    --transactions-per-org 500
```

### Available Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `--organizations` | 10 | Number of organizations to create |
| `--properties-per-org` | 10 | Number of properties per organization |
| `--min-units` | 50 | Minimum units per property |
| `--max-units` | 500 | Maximum units per property |
| `--transactions-per-org` | 200 | Minimum transactions per organization |

## Generated Data Details

### Users & Organizations
- Each organization gets 3-6 users with different roles
- Primary owner with full permissions
- Additional admins and property managers
- All users have password: `1234`

### Properties & Units
- Diverse property types (apartments, offices, malls, etc.)
- Units with varying bedroom counts and rent amounts
- Property images and QR codes
- M-Pesa payment configurations

### Tenants & Leases
- Active tenants for occupied units
- Lease agreements with realistic terms
- Lease documents (agreements, ID copies, etc.)
- Move-in dates within the last 2 years

### Maintenance
- Service providers for each organization
- Maintenance tickets with different priorities
- Ticket updates and status changes
- Cost estimates and actual costs

### Payments & Financials
- Monthly rent payments (80% payment rate)
- M-Pesa transactions with receipt numbers
- Payment reminders for missed payments
- Realistic payment amounts with some variation

### Communications
- SMS templates for different scenarios
- Message history with delivery status
- Notice boards with tenant views
- Emergency and policy notices

### Analytics
- Monthly payment analytics
- SMS usage and delivery metrics
- Property performance metrics
- Custom dashboards and reports

## Data Relationships

The command ensures proper data relationships:
- All data is organization-scoped
- Tenants are properly linked to units and leases
- Payments reference specific leases and tenants
- Maintenance tickets are tied to properties/units
- Analytics data reflects actual transactions

## Reset Database

If you want to start fresh:

```bash
# Clear existing data
python manage.py flush --noinput

# Regenerate migrations (if needed)
python manage.py makemigrations
python manage.py migrate

# Generate new dummy data
python manage.py generate_dummy_data
```

## Performance Notes

- Generation time depends on the amount of data
- Default settings create ~50,000+ database records
- Use smaller numbers for faster generation during development
- The command uses database transactions for data integrity

## Example Usage Scenarios

### Small Development Dataset
```bash
python manage.py generate_dummy_data --organizations 3 --properties-per-org 5 --min-units 10 --max-units 50
```

### Large Testing Dataset
```bash
python manage.py generate_dummy_data --organizations 20 --properties-per-org 15 --transactions-per-org 1000
```

### Demo Dataset
```bash
python manage.py generate_dummy_data --organizations 5 --properties-per-org 8 --min-units 100 --max-units 200
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all apps are properly installed in settings.py
2. **Database Errors**: Run migrations before generating data
3. **Memory Issues**: Reduce data volume for systems with limited memory
4. **Faker Not Found**: Install faker with `pip install faker`

### Verification

After running the command, you can verify the data:

```python
# In Django shell
python manage.py shell

from organizations.models import Organization
from properties.models import Property
from payments.models import RentPayment

print(f"Organizations: {Organization.objects.count()}")
print(f"Properties: {Property.objects.count()}")
print(f"Payments: {RentPayment.objects.count()}")
```

## Data Quality

The generated data includes:
- Realistic names and addresses using Faker
- Proper date ranges and relationships
- Varied but realistic amounts and quantities
- Proper status distributions (active/inactive, etc.)
- Geographic and demographic diversity

This ensures the dummy data closely resembles real-world usage patterns for effective testing and demonstration purposes.
