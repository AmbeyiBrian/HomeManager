@echo off
REM filepath: c:\Users\brian.ambeyi\PycharmProjects\HomeManager\generate_full_data.bat
echo Installing required packages for comprehensive data generation...
cd backend
pip install -r dummy_data_requirements.txt

echo.
echo Generating comprehensive dummy data...
python manage.py generate_full_data --orgs=3 --properties=5 --units=10 --tenants=4 --payments=6 --tickets=3

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Error occurred during data generation. Please check the error message above.
  echo If issue persists, try running: python manage.py generate_full_data --orgs=1 --properties=2 --units=5 --tenants=2 --payments=3 --tickets=2
) else (
  echo.
  echo Comprehensive data generation completed successfully!
)

pause
