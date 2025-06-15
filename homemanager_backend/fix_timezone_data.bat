@echo off
echo Running timezone fix script...
cd %~dp0
python fix_timezone.py
pause
