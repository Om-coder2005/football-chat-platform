import requests
import os
import logging
import time
import json
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class APIFootballService:
    """
    Service for detailed live match events and lineups from API-Football (API-Sports).
    Free Tier: 100 requests/day.
    """
    
    BASE_URL = "https://v3.football.api-sports.io"
    API_KEY = os.getenv("API_FOOTBALL_API_KEY", "")
    _cache = {}

    @staticmethod
    def _make_request(endpoint, params=None):
        if not APIFootballService.API_KEY:
            return None
            
        cache_key = f"{endpoint}_{json.dumps(params, sort_keys=True)}"
        now = time.time()
        
        # Cache live data for 30 seconds, lineups for 1 hour
        ttl = 30 if "fixtures" in endpoint else 3600
        
        if cache_key in APIFootballService._cache:
            cache_time, cache_data = APIFootballService._cache[cache_key]
            if now - cache_time < ttl:
                return cache_data

        headers = {
            "x-rapidapi-key": APIFootballService.API_KEY,
            "x-rapidapi-host": "v3.football.api-sports.io"
        }
        
        try:
            response = requests.get(f"{APIFootballService.BASE_URL}/{endpoint}", headers=headers, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get("response"):
                APIFootballService._cache[cache_key] = (time.time(), data["response"])
                return data["response"]
            return None
        except Exception as e:
            logger.error(f"API-Football Error: {e}")
            return None

    @staticmethod
    def get_live_events(fixture_id):
        """Get live events for a match (goals, cards, subs)"""
        return APIFootballService._make_request("fixtures/events", {"fixture": fixture_id})

    @staticmethod
    def get_lineups(fixture_id):
        """Get match lineups"""
        return APIFootballService._make_request("fixtures/lineups", {"fixture": fixture_id})

    @staticmethod
    def get_match_predictions(fixture_id):
        """Get match predictions/analysis"""
        return APIFootballService._make_request("predictions", {"fixture": fixture_id})

    @staticmethod
    def find_fixture_id(home_name, away_name, date):
        """Map football-data.org match to API-Football fixture ID"""
        # This is tricky as names vary. We search by team names and date.
        res = APIFootballService._make_request("fixtures", {"date": date})
        if not res: return None
        
        # Simple fuzzy match
        home_name = home_name.lower()
        away_name = away_name.lower()
        
        for f in res:
            teams = f.get("teams", {})
            f_home = teams.get("home", {}).get("name", "").lower()
            f_away = teams.get("away", {}).get("name", "").lower()
            
            if (home_name in f_home or f_home in home_name) and (away_name in f_away or f_away in away_name):
                return f.get("fixture", {}).get("id")
        return None
