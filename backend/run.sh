#!/bin/bash
# Setup and run Sport Calendar Backend

echo "🚀 Sport Calendar Backend Setup"
echo "=============================="

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install it first."
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔗 Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "📚 Installing requirements..."
pip install -r requirements.txt -q

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "   ⚠️  Update .env with your settings!"
fi

# Run the app
echo ""
echo "✅ Setup complete!"
echo "🎯 Starting Sport Calendar Backend on port 8000..."
echo "   Open http://localhost:8000/health to verify"
echo ""

python app.py
