@echo off
echo "Generating database migrations..."
python manage.py makemigrations users
python manage.py makemigrations organizations
python manage.py makemigrations properties
python manage.py makemigrations tenants
python manage.py makemigrations maintenance
python manage.py makemigrations notices
python manage.py makemigrations payments
python manage.py makemigrations sms
python manage.py makemigrations analytics

echo "Applying migrations to the database..."
python manage.py migrate

echo "Creating a superuser..."
python manage.py createsuperuser

echo "All done!"
