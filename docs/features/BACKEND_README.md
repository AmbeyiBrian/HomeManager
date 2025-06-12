# HomeManager Backend

A comprehensive property management system with multi-organization support and SMS capabilities.

## Features

- Multi-organization support with role-based access control
- Property and unit management
- Tenant tracking and lease management
- SMS-based communication with tenants
- Maintenance ticket system
- Notices and announcements
- Payment processing with M-Pesa integration
- Analytics and reporting

## Tech Stack

- Django 5.0
- PostgreSQL
- Django REST Framework
- React (frontend, separate repository)

## Prerequisites

- Python 3.10 or higher
- PostgreSQL database
- Virtual environment (recommended)

## Installation

1. Clone this repository
   ```
   git clone https://github.com/yourusername/homemanager_backend.git
   cd homemanager_backend
   ```

2. Create and activate a virtual environment (recommended)
   ```
   python -m venv venv
   venv\Scripts\activate  # On Windows
   source venv/bin/activate  # On Unix/MacOS
   ```

3. Install dependencies
   ```
   pip install -r requirements.txt
   ```

4. Configure the database in `homemanager_backend/settings.py`

5. Run the setup script to create migrations and apply them
   ```
   setup_database.bat  # On Windows
   # OR
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   ```

6. Start the development server
   ```
   run_server.bat  # On Windows
   # OR
   python manage.py runserver
   ```

7. Access the API at http://localhost:8000/api/
8. Access the admin interface at http://localhost:8000/admin/

## API Documentation

API documentation is available at http://localhost:8000/api/docs/ when the server is running.

## Project Structure

- `users`: Custom user model with organization-based access control
- `organizations`: Multi-tenancy support and subscription management
- `properties`: Property and unit management
- `tenants`: Tenant and lease management
- `maintenance`: Ticket system for maintenance issues
- `notices`: System notifications and announcements
- `payments`: Payment processing with M-Pesa integration
- `sms`: SMS templates and communication tracking
- `analytics`: Reports and dashboards

## License

Proprietary - All rights reserved
