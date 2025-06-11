@echo off
echo Starting HomeManager Backend with QR Code API...
echo.

cd %~dp0
call ..\home\Scripts\activate.bat
echo Virtual environment activated.
echo.

echo Running Django server on port 8000...
python manage.py runserver 0.0.0.0:8000

echo Server stopped.
