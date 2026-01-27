import os
from dotenv import load_dotenv

load_dotenv()

FOOTBALL_API_KEY = os.getenv('FOOTBALL_API_KEY', 'demo_key_12345')
API_BASE_URL = os.getenv('API_BASE_URL', 'https://v3.football.api-sports.io')
