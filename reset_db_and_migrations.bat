@echo off
echo Starting database and migrations reset process...

cd %~dp0\backend

echo Removing migration files...
for %%G in (organizations properties users tenants payments notices maintenance) do (
    echo Cleaning migrations in %%G app...
    del /q %%G\migrations\0*.py 2>nul
)

echo Creating __init__.py files if they don't exist
for %%G in (organizations properties users tenants payments notices maintenance) do (
    echo. > %%G\migrations\__init__.py
)

echo Dropping PostgreSQL database...
echo -- First terminate all connections to the database
set PGPASSWORD=1234
echo SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'homemanager_db' AND pid ^<^> pg_backend_pid(); | psql -U postgres
echo DROP DATABASE IF EXISTS homemanager_db; | psql -U postgres

echo Creating new database...
echo CREATE DATABASE homemanager_db; | psql -U postgres

echo Making migrations...
python manage.py makemigrations organizations users properties tenants payments notices maintenance

echo Migrating database...
python manage.py migrate

echo Generating dummy data...
python manage.py generate_dummy_data

echo Creating a superuser (admin/admin1234)...
python manage.py create_test_superuser

echo Process completed!
pause
