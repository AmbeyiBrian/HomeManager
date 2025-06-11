@echo off
REM Start Django development server with DEBUG level logging

echo Starting Django server with verbose logging...
cd homemanager_backend
python manage.py runserver --traceback

pause
