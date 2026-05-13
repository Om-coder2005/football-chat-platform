import requests
import os
import logging
import time
import json
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

logger = logging.getLogger(__name__)

# SportsDB service removed

# Mapping of common club names to football-data.org team IDs
TEAM_NAME_TO_ID = {
    "real madrid": 86,
    "cf real madrid": 86,
    "fc barcelona": 81,
    "barcelona": 81,
    "barca": 81,
    "manchester united": 66,
    "man united": 66,
    "man utd": 66,
    "manchester city": 65,
    "man city": 65,
    "liverpool": 64,
    "liverpool fc": 64,
    "arsenal": 57,
    "arsenal fc": 57,
    "chelsea": 61,
    "chelsea fc": 61,
    "tottenham": 73,
    "tottenham hotspur": 73,
    "spurs": 73,
    "bayern munich": 5,
    "bayern": 5,
    "fc bayern": 5,
    "borussia dortmund": 4,
    "dortmund": 4,
    "bvb": 4,
    "juventus": 109,
    "juventus fc": 109,
    "juve": 109,
    "psg": 524,
    "paris saint-germain": 524,
    "paris saint germain": 524,
    "ac milan": 98,
    "milan": 98,
    "inter milan": 108,
    "inter": 108,
    "internazionale": 108,
    "atletico madrid": 78,
    "atletico": 78,
    "napoli": 113,
    "ssc napoli": 113,
    "benfica": 1903,
    "sl benfica": 1903,
    "porto": 503,
    "fc porto": 503,
    "ajax": 678,
    "afc ajax": 678,
    "as roma": 100,
    "roma": 100,
    "lazio": 110,
    "ss lazio": 110,
    "sevilla": 559,
    "sevilla fc": 559,
    "villarreal": 94,
    "villarreal cf": 94,
    "real sociedad": 92,
    "athletic bilbao": 77,
    "athletic club": 77,
    "rb leipzig": 721,
    "leipzig": 721,
    "bayer leverkusen": 3,
    "leverkusen": 3,
    "aston villa": 58,
    "newcastle": 67,
    "newcastle united": 67,
    "west ham": 563,
    "west ham united": 563,
    "everton": 62,
    "everton fc": 62,
    "wolverhampton": 76,
    "wolves": 76,
    "brighton": 397,
    "brighton & hove albion": 397,
    "crystal palace": 354,
    "nottingham forest": 351,
    "fulham": 63,
    "fulham fc": 63,
    "bournemouth": 1044,
    "lyon": 523,
    "olympique lyonnais": 523,
    "marseille": 516,
    "olympique marseille": 516,
    "monaco": 548,
    "as monaco": 548,
    "lille": 521,
    "lille osc": 521,
    "fiorentina": 99,
    "acf fiorentina": 99,
    "atalanta": 102,
    "atalanta bc": 102,
}


class MatchService:
    """
    Service for fetching live match data from football-data.org API.
    Supports API key rotation and caching to handle workload efficiently.
    """
    
    BASE_URL = "https://api.football-data.org/v4"
    
    # Load API keys as a list from environment (comma-separated)
    _raw_keys = os.getenv("FOOTBALL_DATA_API_KEY", "")
    API_KEYS = [k.strip() for k in _raw_keys.split(",") if k.strip()]
    
    _current_key_idx = 0
    _cache = {}
    _key_cooldowns = {} # Stores (timestamp) when a key was rate limited
    
    @staticmethod
    def _get_active_key():
        """Get the current API key, skipping those on cooldown."""
        if not MatchService.API_KEYS:
            return None
            
        now = time.time()
        start_idx = MatchService._current_key_idx
        
        # Try to find a key not on cooldown
        for _ in range(len(MatchService.API_KEYS)):
            idx = MatchService._current_key_idx
            key = MatchService.API_KEYS[idx]
            
            # If not on cooldown or cooldown expired
            cooldown_until = MatchService._key_cooldowns.get(key, 0)
            if now >= cooldown_until:
                return key
                
            # Move to next key
            MatchService._current_key_idx = (MatchService._current_key_idx + 1) % len(MatchService.API_KEYS)
            
        # All keys on cooldown, return the one with earliest expiry or just the current
        return MatchService.API_KEYS[start_idx]

    @staticmethod
    def _rotate_key():
        """Move to the next available API key."""
        if len(MatchService.API_KEYS) > 1:
            MatchService._current_key_idx = (MatchService._current_key_idx + 1) % len(MatchService.API_KEYS)
            logger.info(f"Rotating to API key index: {MatchService._current_key_idx}")

    @staticmethod
    def _make_request(endpoint, params=None, retries=None):
        """
        Make HTTP request with key rotation and automatic throttling.
        """
        if not MatchService.API_KEYS:
            logger.warning("No Football Data API keys configured.")
            return MatchService._get_empty_response(endpoint)
            
        # Default retries to number of keys
        if retries is None:
            retries = len(MatchService.API_KEYS) * 2

        cache_key = f"{endpoint}_{json.dumps(params, sort_keys=True)}"
        now = time.time()
        
        # Caching logic
        is_matches = "/matches" in endpoint
        is_live_filter = params and params.get("status") == "LIVE"
        ttl = 60 if (is_matches or is_live_filter) else 300
        
        if cache_key in MatchService._cache:
            cache_time, cache_data = MatchService._cache[cache_key]
            if now - cache_time < ttl:
                return cache_data
        
        attempt = 0
        while attempt < retries:
            api_key = MatchService._get_active_key()
            url = f"{MatchService.BASE_URL}{endpoint}"
            headers = {
                "X-Auth-Token": api_key,
                "Content-Type": "application/json"
            }
            
            try:
                response = requests.get(url, headers=headers, params=params, timeout=15)
                
                if response.status_code == 429:
                    reset_time = int(response.headers.get("X-RequestCounter-Reset", 60))
                    logger.warning(f"Rate limited on key index {MatchService._current_key_idx}. Cooling down for {reset_time}s.")
                    
                    # Mark current key as on cooldown
                    MatchService._key_cooldowns[api_key] = time.time() + reset_time
                    
                    # Try next key immediately
                    MatchService._rotate_key()
                    attempt += 1
                    continue
                
                response.raise_for_status()
                
                # Success - cache and return
                data = response.json()
                MatchService._cache[cache_key] = (time.time(), data)
                
                # Cleanup cache
                if len(MatchService._cache) > 500:
                    oldest = min(MatchService._cache.keys(), key=lambda k: MatchService._cache[k][0])
                    del MatchService._cache[oldest]
                    
                return data
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Football API Error (Key {MatchService._current_key_idx}): {e}")
                if attempt < retries - 1:
                    MatchService._rotate_key()
                    attempt += 1
                    time.sleep(1)
                    continue
                return MatchService._get_empty_response(endpoint)
                
        return MatchService._get_empty_response(endpoint)
            
    @staticmethod
    def _get_empty_response(endpoint):
        if "/competitions" in endpoint:
            if "standings" in endpoint: return {"standings": []}
            return {"count": 0, "competitions": []}
        if "/matches" in endpoint: return {"count": 0, "matches": []}
        return {}
    
    @staticmethod
    def get_live_matches():
        today = datetime.now().strftime("%Y-%m-%d")
        params = {"dateFrom": today, "dateTo": today}
        data = MatchService._make_request("/matches", params)
        all_matches = data.get("matches", [])
        live = [m for m in all_matches if m.get("status") in ("IN_PLAY", "PAUSED", "LIVE")]
        return {"count": len(live), "matches": live} if live else data
    
    @staticmethod
    def get_todays_matches_grouped():
        today = datetime.now().strftime("%Y-%m-%d")
        data = MatchService._make_request("/matches", {"dateFrom": today, "dateTo": today})
        all_matches = data.get("matches", [])
        groups = {}
        for match in all_matches:
            comp = match.get("competition", {})
            cid = comp.get("id", 0)
            if cid not in groups: groups[cid] = {"competition": comp, "matches": []}
            groups[cid]["matches"].append(match)
        return {"count": len(all_matches), "grouped_matches": sorted(groups.values(), key=lambda g: g["competition"].get("name", ""))}

    @staticmethod
    def get_available_competitions():
        data = MatchService._make_request("/competitions")
        comps = data.get("competitions", [])
        filtered = [{"id": c.get("id"), "name": c.get("name"), "code": c.get("code"), "emblem": c.get("emblem"), "area": c.get("area", {})} for c in comps if c.get("id") and c.get("name")]
        return {"count": len(filtered), "competitions": filtered}

    @staticmethod
    def get_matches_by_date_range(date_from, date_to):
        return MatchService._make_request("/matches", {"dateFrom": date_from, "dateTo": date_to})
    
    # Cache for fully-enriched match objects (separate from raw API cache)
    _enriched_cache: dict = {}

    @staticmethod
    def get_match_by_id(match_id, enrich=True):
        from src.services.ai_stats_service import AIStatsService
        import time

        eck = f"enriched_{match_id}"
        now = time.time()

        # Serve from enrichment cache if available
        if eck in MatchService._enriched_cache:
            cache_time, cached = MatchService._enriched_cache[eck]
            # Finished matches: cache 24 h; live matches: cache 30 s
            ttl = 86400 if cached.get("status") == "FINISHED" else 30
            if now - cache_time < ttl:
                return cached

        data = MatchService._make_request(f"/matches/{match_id}")
        if enrich and data:
            try:
                data = AIStatsService.enrich_match_data(data)
                MatchService._enriched_cache[eck] = (now, data)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Enrichment error for match {match_id}: {e}")
        return data
    
    @staticmethod
    def get_competition_matches(competition_id, **params):
        return MatchService._make_request(f"/competitions/{competition_id}/matches", params)
    
    @staticmethod
    def get_competition_standings(competition_id):
        return MatchService._make_request(f"/competitions/{competition_id}/standings")
    
    @staticmethod
    def get_team_matches(team_id, **params):
        return MatchService._make_request(f"/teams/{team_id}/matches", params)

    @staticmethod
    def _find_team_id(name):
        if not name: return None
        norm = name.strip().lower()
        if norm in TEAM_NAME_TO_ID: return TEAM_NAME_TO_ID[norm]
        for k, v in TEAM_NAME_TO_ID.items():
            if k in norm or norm in k: return v
        return None

    @staticmethod
    def get_matches_for_team(team_name):
        if not team_name: return {"count": 0, "matches": [], "source": "none"}
        team_id = MatchService._find_team_id(team_name)
        if not team_id: return {"count": 0, "matches": [], "source": "none"}
        
        # Fetch a wider range of matches (past and future) to find the most relevant one
        # football-data.org team matches endpoint
        data = MatchService._make_request(f"/teams/{team_id}/matches", {"limit": 10})
        matches = data.get("matches", [])
        
        if not matches:
            return {"count": 0, "matches": [], "source": "none"}
            
        now = datetime.utcnow()
        
        # 1. Look for LIVE/IN_PLAY matches first
        live_matches = [m for m in matches if m.get("status") in ("IN_PLAY", "PAUSED", "LIVE")]
        if live_matches:
            return {"count": 1, "matches": [live_matches[0]], "source": "live"}
            
        # 2. Look for the most recently FINISHED match
        finished_matches = [m for m in matches if m.get("status") == "FINISHED"]
        if finished_matches:
            # Sort by date descending to get the absolute latest
            latest_finished = max(finished_matches, key=lambda m: m.get("utcDate", ""))
            
            # Only show it if it's very recent (e.g., within last 24 hours) OR if there's no upcoming match soon
            return {"count": 1, "matches": [latest_finished], "source": "closest"}

        # 3. Fallback to the closest match (likely upcoming)
        closest = min(matches, key=lambda m: abs((datetime.strptime(m.get("utcDate", "").replace("Z",""), "%Y-%m-%dT%H:%M:%S") - now).total_seconds()))
        return {"count": 1, "matches": [closest], "source": "closest"}
