import requests
import os
import logging
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

logger = logging.getLogger(__name__)

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
    Service for fetching live match data from football-data.org API
    All business logic for match data operations goes here
    """
    
    BASE_URL = "https://api.football-data.org/v4"
    API_KEY = os.getenv("FOOTBALL_DATA_API_KEY", "")
    
    @staticmethod
    def _make_request(endpoint, params=None):
        """
        Make HTTP request to football-data.org API
        @param {string} endpoint - API endpoint path
        @param {dict} params - Query parameters
        @returns {dict} API response data
        @throws {Exception} If API request fails
        """
        if not MatchService.API_KEY:
            raise Exception("Football Data API key not configured. Please set FOOTBALL_DATA_API_KEY in .env")
        
        url = f"{MatchService.BASE_URL}{endpoint}"
        headers = {
            "X-Auth-Token": MatchService.API_KEY,
            "Content-Type": "application/json"
        }
        
        try:
            print(f"[MatchService] Requesting: {url} params={params}")
            response = requests.get(url, headers=headers, params=params, timeout=15)
            print(f"[MatchService] Response status: {response.status_code}")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code if e.response else "unknown"
            error_body = e.response.text[:500] if e.response else "No response body"
            print(f"[MatchService] HTTP Error {status_code}: {error_body}")
            raise Exception(f"Football API error ({status_code}): {error_body}")
        except requests.exceptions.ConnectionError as e:
            print(f"[MatchService] Connection error: {str(e)}")
            raise Exception(f"Cannot connect to football-data.org: {str(e)}")
        except requests.exceptions.Timeout as e:
            print(f"[MatchService] Timeout: {str(e)}")
            raise Exception(f"Football API request timed out")
        except requests.exceptions.RequestException as e:
            print(f"[MatchService] Request error: {str(e)}")
            raise Exception(f"Failed to fetch match data: {str(e)}")
    
    @staticmethod
    def get_live_matches():
        """
        Get today's matches. Fetches by date filter first (free tier friendly),
        then filters for any live matches client-side.
        @returns {dict} Matches data with count and matches list
        @throws {Exception} If API request fails
        """
        today = datetime.now().strftime("%Y-%m-%d")
        params = {
            "dateFrom": today,
            "dateTo": today
        }
        data = MatchService._make_request("/matches", params)

        # Separate live matches from scheduled/finished
        all_matches = data.get("matches", [])
        live_matches = [m for m in all_matches if m.get("status") in ("IN_PLAY", "PAUSED", "LIVE")]

        if live_matches:
            return {"count": len(live_matches), "matches": live_matches}

        # No live matches right now, return all of today's matches
        return data
    
    @staticmethod
    def get_todays_matches_grouped():
        """
        Get all of today's matches grouped by competition.
        Returns a list of competition groups, each containing the competition
        info and its matches for today.
        @returns {dict} Dict with grouped_matches list and total count
        @throws {Exception} If API request fails
        """
        today = datetime.now().strftime("%Y-%m-%d")
        params = {"dateFrom": today, "dateTo": today}
        data = MatchService._make_request("/matches", params)

        all_matches = data.get("matches", [])
        groups = {}

        for match in all_matches:
            comp = match.get("competition", {})
            comp_id = comp.get("id", 0)
            if comp_id not in groups:
                groups[comp_id] = {
                    "competition": comp,
                    "matches": []
                }
            groups[comp_id]["matches"].append(match)

        grouped_list = sorted(
            groups.values(),
            key=lambda g: g["competition"].get("name", "")
        )

        return {
            "count": len(all_matches),
            "grouped_matches": grouped_list
        }

    @staticmethod
    def get_available_competitions():
        """
        Get the list of competitions available on the free tier.
        Returns only competitions that have an id and name.
        @returns {dict} Dict with competitions list
        @throws {Exception} If API request fails
        """
        data = MatchService._make_request("/competitions")
        competitions = data.get("competitions", [])

        # Filter to only include competitions with proper data
        filtered = [
            {
                "id": c.get("id"),
                "name": c.get("name"),
                "code": c.get("code"),
                "type": c.get("type"),
                "emblem": c.get("emblem"),
                "area": c.get("area", {}),
                "currentSeason": c.get("currentSeason"),
            }
            for c in competitions
            if c.get("id") and c.get("name")
        ]

        return {"count": len(filtered), "competitions": filtered}

    @staticmethod
    def get_matches_by_date_range(date_from, date_to):
        """
        Get matches within a date range
        @param {string} date_from - Start date (YYYY-MM-DD)
        @param {string} date_to - End date (YYYY-MM-DD)
        @returns {dict} Matches data
        @throws {Exception} If API request fails or dates invalid
        """
        # Validate date format
        try:
            datetime.strptime(date_from, "%Y-%m-%d")
            datetime.strptime(date_to, "%Y-%m-%d")
        except ValueError:
            raise Exception("Invalid date format. Use YYYY-MM-DD")
        
        if date_from > date_to:
            raise Exception("date_from must be before or equal to date_to")
        
        params = {
            "dateFrom": date_from,
            "dateTo": date_to
        }
        return MatchService._make_request("/matches", params)
    
    @staticmethod
    def get_match_by_id(match_id, enrich=True):
        """
        Get detailed information about a specific match.
        When enrich=True, uses AI-powered lookup to add statistics,
        goals, and lineups from SofaScore via Google Gemini.
        @param {int} match_id - Match ID
        @param {bool} enrich - Whether to enrich with AI stats (default True)
        @returns {dict} Match details (enriched if applicable)
        @throws {Exception} If API request fails
        """
        from src.services.ai_stats_service import AIStatsService

        data = MatchService._make_request(f"/matches/{match_id}")

        if enrich:
            try:
                data = AIStatsService.enrich_match_data(data)
            except Exception as exc:
                logger.warning("AI stats enrichment failed for match %s: %s", match_id, exc)

        return data
    
    @staticmethod
    def get_competitions():
        """
        Get all available competitions (leagues)
        @returns {dict} Competitions data
        @throws {Exception} If API request fails
        """
        return MatchService._make_request("/competitions")
    
    @staticmethod
    def get_competition_matches(competition_id, status=None, date_from=None, date_to=None):
        """
        Get matches for a specific competition
        @param {int} competition_id - Competition ID (e.g., 2021 for Premier League)
        @param {string} status - Filter by status (SCHEDULED, LIVE, FINISHED, etc.)
        @param {string} date_from - Start date filter (YYYY-MM-DD)
        @param {string} date_to - End date filter (YYYY-MM-DD)
        @returns {dict} Matches data
        @throws {Exception} If API request fails
        """
        params = {}
        if status:
            params["status"] = status
        if date_from:
            params["dateFrom"] = date_from
        if date_to:
            params["dateTo"] = date_to
        
        return MatchService._make_request(f"/competitions/{competition_id}/matches", params)
    
    @staticmethod
    def get_competition_standings(competition_id):
        """
        Get league table/standings for a competition
        @param {int} competition_id - Competition ID
        @returns {dict} Standings data
        @throws {Exception} If API request fails
        """
        return MatchService._make_request(f"/competitions/{competition_id}/standings")
    
    @staticmethod
    def get_team_matches(team_id, status=None, limit=10):
        """
        Get matches for a specific team
        @param {int} team_id - Team ID
        @param {string} status - Filter by status
        @param {int} limit - Maximum number of matches to return
        @returns {dict} Matches data
        @throws {Exception} If API request fails
        """
        params = {"limit": limit}
        if status:
            params["status"] = status
        
        return MatchService._make_request(f"/teams/{team_id}/matches", params)

    @staticmethod
    def _find_team_id(team_name):
        """
        Look up football-data.org team ID from a community club name.
        Uses the known mapping dictionary with fuzzy matching.
        @param {string} team_name - Club name to search for
        @returns {int|None} Team ID or None if not found
        """
        if not team_name:
            return None

        normalized = team_name.strip().lower()

        # Direct match
        if normalized in TEAM_NAME_TO_ID:
            return TEAM_NAME_TO_ID[normalized]

        # Partial match - check if any known name is contained in the input or vice versa
        for key, team_id in TEAM_NAME_TO_ID.items():
            if key in normalized or normalized in key:
                return team_id

        return None

    @staticmethod
    def _filter_matches_by_team(matches, team_name_lower):
        """
        Filter a list of matches to only include those involving a specific team.
        Checks home and away team names and short names.
        @param {list} matches - List of match dicts from football-data.org
        @param {string} team_name_lower - Lowercased team name to search for
        @returns {list} Filtered list of matches involving the team
        """
        filtered = []
        for match in matches:
            home_name = (match.get("homeTeam", {}).get("name", "") or "").lower()
            away_name = (match.get("awayTeam", {}).get("name", "") or "").lower()
            home_short = (match.get("homeTeam", {}).get("shortName", "") or "").lower()
            away_short = (match.get("awayTeam", {}).get("shortName", "") or "").lower()
            home_tla = (match.get("homeTeam", {}).get("tla", "") or "").lower()
            away_tla = (match.get("awayTeam", {}).get("tla", "") or "").lower()

            if (team_name_lower in home_name or team_name_lower in away_name or
                    team_name_lower in home_short or team_name_lower in away_short or
                    home_name in team_name_lower or away_name in team_name_lower or
                    team_name_lower == home_tla or team_name_lower == away_tla):
                filtered.append(match)

        return filtered

    @staticmethod
    def _parse_utc_date(utc_date_str):
        """
        Parse a UTC date string from football-data.org API response.
        Handles formats like '2024-01-15T20:00:00Z'.
        @param {string} utc_date_str - UTC date string
        @returns {datetime} Parsed datetime object
        """
        if not utc_date_str:
            return datetime.utcnow()
        clean = utc_date_str.replace("Z", "").split("+")[0]
        try:
            return datetime.strptime(clean, "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            return datetime.utcnow()

    @staticmethod
    def get_matches_for_team(team_name):
        """
        Get today's matches for a specific team identified by club name.
        First checks today's global matches for the team, then falls back
        to fetching the team's most recent or upcoming match via team ID.
        @param {string} team_name - The club name from the community
        @returns {dict} Dict with count, matches list, and source indicator
        @throws {Exception} If team_name is empty
        """
        if not team_name or not team_name.strip():
            raise Exception("Team name is required")

        team_lower = team_name.strip().lower()
        today = datetime.now().strftime("%Y-%m-%d")

        # Step 1: Check today's matches across all competitions for this team
        try:
            params = {"dateFrom": today, "dateTo": today}
            data = MatchService._make_request("/matches", params)
            all_matches = data.get("matches", [])

            team_matches = MatchService._filter_matches_by_team(all_matches, team_lower)
            if team_matches:
                # Prefer live matches if any
                live = [m for m in team_matches if m.get("status") in ("IN_PLAY", "PAUSED", "LIVE")]
                if live:
                    return {"count": len(live), "matches": live, "source": "live"}
                return {"count": len(team_matches), "matches": team_matches, "source": "today"}
        except Exception as exc:
            logger.warning("Failed to get today's matches for team '%s': %s", team_name, exc)

        # Step 2: Resolve team ID and fetch their schedule directly
        team_id = MatchService._find_team_id(team_name)
        if not team_id:
            return {
                "count": 0,
                "matches": [],
                "source": "none",
                "message": f"Could not find team '{team_name}' in our database"
            }

        # Step 2a: Try today's matches from team endpoint
        try:
            data = MatchService._make_request(
                f"/teams/{team_id}/matches",
                {"dateFrom": today, "dateTo": today, "limit": 5}
            )
            matches = data.get("matches", [])
            if matches:
                return {"count": len(matches), "matches": matches, "source": "team_today"}
        except Exception as exc:
            logger.warning("Failed team today lookup for ID %s: %s", team_id, exc)

        # Step 2b: Get the team's recent and upcoming matches to find closest one
        try:
            data = MatchService._make_request(
                f"/teams/{team_id}/matches",
                {"limit": 15}
            )
            matches = data.get("matches", [])
            if matches:
                now = datetime.utcnow()
                closest = min(
                    matches,
                    key=lambda m: abs(
                        (MatchService._parse_utc_date(m.get("utcDate", "")) - now).total_seconds()
                    )
                )
                return {"count": 1, "matches": [closest], "source": "closest"}
        except Exception as exc:
            logger.warning("Failed team schedule lookup for ID %s: %s", team_id, exc)

        return {"count": 0, "matches": [], "source": "none"}
