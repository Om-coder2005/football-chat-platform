import requests
import os
import logging
import time
import json
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class SportsDBService:
    """
    Service for fetching high-quality team logos, banners, and player images from TheSportsDB.
    Free Tier: Generous access for non-commercial use.
    """
    
    BASE_URL = "https://www.thesportsdb.com/api/v1/json"
    API_KEY = os.getenv("THESPORTSDB_API_KEY", "3") # '3' is often a test/free key for dev
    _cache = {}

    @staticmethod
    def _make_request(endpoint, params=None):
        if not SportsDBService.API_KEY:
            return None
            
        cache_key = f"{endpoint}_{json.dumps(params, sort_keys=True)}"
        now = time.time()
        
        # Aggressive caching for media assets (24 hours)
        ttl = 86400
        
        if cache_key in SportsDBService._cache:
            cache_time, cache_data = SportsDBService._cache[cache_key]
            if now - cache_time < ttl:
                return cache_data

        # Robustness check: If API_KEY accidentally contains the full URL (common user error)
        api_key = SportsDBService.API_KEY
        if "thesportsdb.com" in api_key:
            # Extract the key part if possible, or default to '3'
            parts = api_key.split('/')
            # Typical URL: https://www.thesportsdb.com/api/v1/json/3/searchteams.php
            # Key is usually the segment after 'json'
            if 'json' in parts:
                idx = parts.index('json')
                if len(parts) > idx + 1:
                    api_key = parts[idx + 1]
                else:
                    api_key = "3"
            else:
                api_key = "3"

        url = f"{SportsDBService.BASE_URL}/{api_key}/{endpoint}.php"
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            SportsDBService._cache[cache_key] = (time.time(), data)
            return data
        except Exception as e:
            logger.error(f"TheSportsDB Error: {e}")
            return None

    @staticmethod
    def search_team(team_name):
        """Search for a team to get logos and badges"""
        res = SportsDBService._make_request("searchteams", {"t": team_name})
        if res and res.get("teams"):
            return res["teams"][0]
        return None

    @staticmethod
    def get_team_badge(team_name):
        """Get the official team badge URL"""
        team = SportsDBService.search_team(team_name)
        return team.get("strTeamBadge") if team else None

    @staticmethod
    def get_team_banner(team_name):
        """Get the official team banner URL"""
        team = SportsDBService.search_team(team_name)
        return team.get("strTeamBanner") if team else None

    @staticmethod
    def get_player_image(player_name):
        """Get a player's official image"""
        res = SportsDBService._make_request("searchplayers", {"p": player_name})
        if res and res.get("player"):
            return res["player"][0].get("strThumb")
        return None
