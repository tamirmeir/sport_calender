@echo off
REM Setup and run Sport Calendar Backend for Windows

echo.
echo 🚀 Sport Calendar Backend Setup
echo ==============================

REM Check if Python 3 is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python 3 is not installed. Please install it first.
    pause
    exit /b 1
)

echo ✓ Python found: 
python --version

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔗 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install requirements
echo 📚 Installing requirements...
pip install -r requirements.txt -q

REM Create .env if it doesn't exist
if not exist ".env" (
    echo ⚙️  Creating .env file...
    copy .env.example .env
    echo    ⚠️  Update .env with your settings!
)

REM Run the app
echo.
echo ✅ Setup complete!
echo 🎯 Starting Sport Calendar Backend on port 8000...
echo    Open http://localhost:8000/health to verify
echo.

python app.py
pause
