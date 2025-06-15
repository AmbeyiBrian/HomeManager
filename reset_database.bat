@echo off
echo This script will:
echo  1. Delete all migrations
echo  2. Drop the database
echo  3. Create a new database
echo  4. Run migrations
echo  5. Generate dummy data
echo  6. Create an admin user (username: admin, password: admin1234)
echo.
echo WARNING: All data will be lost!
echo.
set /p confirm="Are you sure you want to continue? (y/n): "

if /i "%confirm%"=="y" (
    call reset_db_and_migrations.bat
) else (
    echo Operation canceled.
)
