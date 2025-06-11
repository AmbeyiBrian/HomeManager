@echo off
echo Installing required dependencies...
pip install faker

echo.
echo Generating comprehensive dummy data...
echo This will create:
echo - 10 organizations
echo - 10 properties per organization (100 total)
echo - 50-500 units per property
echo - At least 200 transactions per organization
echo - Realistic tenants, leases, maintenance tickets, notices, payments, SMS, and analytics data
echo.

python manage.py generate_dummy_data

echo.
echo Data generation completed!
pause
