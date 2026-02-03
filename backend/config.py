import os
from dotenv import load_dotenv

# Load from backend/.env first, then fall back to root/.env
load_dotenv()  # backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))  # root .env

FOOTBALL_API_KEY = os.getenv('FOOTBALL_API_KEY', 'demo_key_12345')
API_BASE_URL = os.getenv('API_BASE_URL', 'https://v3.football.api-sports.io')
