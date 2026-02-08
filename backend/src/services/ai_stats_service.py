import os
import json
import logging
import hashlib
from datetime import datetime
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

logger = logging.getLogger(__name__)

# In-memory cache to avoid redundant AI lookups for the same match
_stats_cache = {}

# Maximum number of cached entries to prevent memory bloat
MAX_CACHE_SIZE = 200


class AIStatsService:
    """
    Service that uses Google Gemini with Google Search grounding
    to look up detailed match statistics from SofaScore.
    All business logic for AI-powered stats retrieval goes here.
    """

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

    @staticmethod
    def _get_cache_key(home_team, away_team, match_date):
        """
        Generate a unique cache key for a match lookup.
        @param {string} home_team - Home team name
        @param {string} away_team - Away team name
        @param {string} match_date - Match date (YYYY-MM-DD)
        @returns {string} MD5 hash key for caching
        """
        raw = f"{home_team.lower().strip()}_{away_team.lower().strip()}_{match_date}"
        return hashlib.md5(raw.encode()).hexdigest()

    @staticmethod
    def _build_stats_prompt(home_team, away_team, match_date, score_home, score_away):
        """
        Build a precise prompt for Gemini to look up match statistics.
        Uses a broad search query targeting multiple football stat sources.
        @param {string} home_team - Home team name
        @param {string} away_team - Away team name
        @param {string} match_date - Match date (YYYY-MM-DD)
        @param {int} score_home - Home team final score
        @param {int} score_away - Away team final score
        @returns {string} The prompt string
        """
        return (
            f"Look up the detailed match statistics for the football match "
            f"{home_team} vs {away_team} played on {match_date}. "
            f"The final score was {home_team} {score_home} - {score_away} {away_team}.\n\n"
            f"Search football statistics websites like SofaScore, ESPN, FBref, FlashScore, "
            f"or any reliable source to find the actual match stats.\n\n"
            f"I need the following stats. Return ONLY valid JSON, no markdown, no explanation:\n"
            '{"statistics":{"ball_possession":{"home":<num>,"away":<num>},'
            '"total_shots":{"home":<num>,"away":<num>},'
            '"shots_on_target":{"home":<num>,"away":<num>},'
            '"shots_off_target":{"home":<num>,"away":<num>},'
            '"corner_kicks":{"home":<num>,"away":<num>},'
            '"fouls":{"home":<num>,"away":<num>},'
            '"offsides":{"home":<num>,"away":<num>},'
            '"saves":{"home":<num>,"away":<num>},'
            '"yellow_cards":{"home":<num>,"away":<num>},'
            '"red_cards":{"home":<num>,"away":<num>}},'
            '"goals":[{"minute":<num>,"scorer":"<name>","assist":"<name or null>",'
            '"team":"home" or "away","type":"REGULAR" or "PENALTY" or "OWN"}],'
            '"lineups":{"home":{"formation":"<e.g. 4-3-3>",'
            '"startingXI":[{"name":"<name>","number":<num>,"position":"<GK/DF/MF/FW>"}],'
            '"coach":"<name>"},"away":{"formation":"<e.g. 4-4-2>",'
            '"startingXI":[{"name":"<name>","number":<num>,"position":"<GK/DF/MF/FW>"}],'
            '"coach":"<name>"}},"source":"web_search"}\n\n'
            "Use numbers for possession (e.g. 65 not '65%'). "
            "If a stat is truly unavailable use 0. Return ONLY JSON."
        )

    @staticmethod
    def get_match_stats(home_team, away_team, match_date, score_home, score_away):
        """
        Fetch detailed match statistics using Gemini AI with Google Search grounding.
        Results are cached in memory to avoid redundant API calls.
        @param {string} home_team - Home team name
        @param {string} away_team - Away team name
        @param {string} match_date - Match date (YYYY-MM-DD)
        @param {int} score_home - Home team final score
        @param {int} score_away - Away team final score
        @returns {dict|None} Parsed match statistics or None if lookup fails
        """
        if not AIStatsService.GEMINI_API_KEY:
            logger.warning("Gemini API key not configured, skipping AI stats lookup")
            return None

        # Check cache first
        cache_key = AIStatsService._get_cache_key(home_team, away_team, match_date)
        if cache_key in _stats_cache:
            logger.info("AI stats cache hit for %s vs %s on %s", home_team, away_team, match_date)
            return _stats_cache[cache_key]

        prompt = AIStatsService._build_stats_prompt(
            home_team, away_team, match_date, score_home, score_away
        )

        try:
            client = genai.Client(api_key=AIStatsService.GEMINI_API_KEY)

            # Use Google Search grounding so Gemini can look up real data
            grounding_tool = types.Tool(google_search=types.GoogleSearch())
            config = types.GenerateContentConfig(
                tools=[grounding_tool],
                temperature=0.1,
            )

            logger.info(
                "Fetching AI stats for %s vs %s on %s",
                home_team, away_team, match_date,
            )

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config,
            )

            raw_text = response.text.strip()
            parsed = AIStatsService._parse_response(raw_text)

            if parsed:
                # Evict oldest entries if cache is full
                if len(_stats_cache) >= MAX_CACHE_SIZE:
                    oldest_key = next(iter(_stats_cache))
                    del _stats_cache[oldest_key]

                _stats_cache[cache_key] = parsed
                logger.info(
                    "AI stats successfully fetched and cached for %s vs %s",
                    home_team, away_team,
                )
                return parsed

            logger.warning(
                "Failed to parse AI stats response for %s vs %s",
                home_team, away_team,
            )
            return None

        except Exception as exc:
            logger.error(
                "Gemini AI stats lookup failed for %s vs %s: %s",
                home_team, away_team, str(exc),
            )
            return None

    @staticmethod
    def _parse_response(raw_text):
        """
        Parse the raw Gemini response text into a Python dict.
        Handles cases where the response includes markdown code fences.
        @param {string} raw_text - Raw text from Gemini response
        @returns {dict|None} Parsed JSON dict or None if parsing fails
        """
        if not raw_text:
            return None

        # Strip markdown code fences if present
        text = raw_text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first line (```json or ```) and last line (```)
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            # Try to find JSON within the text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    data = json.loads(text[start:end])
                except json.JSONDecodeError:
                    logger.error("Failed to parse JSON from AI response: %s", text[:200])
                    return None
            else:
                logger.error("No JSON found in AI response: %s", text[:200])
                return None

        # Validate expected structure
        if "statistics" not in data:
            logger.warning("AI response missing 'statistics' key")
            return None

        # Replace null values with 0 in statistics
        stats = data.get("statistics", {})
        for key, val in stats.items():
            if isinstance(val, dict):
                for side in ("home", "away"):
                    if val.get(side) is None:
                        val[side] = 0

        return data

    @staticmethod
    def enrich_match_data(match_data):
        """
        Enrich a football-data.org match response with AI-fetched statistics.
        Only enriches matches that are FINISHED or IN_PLAY and lack statistics.
        @param {dict} match_data - Match data dict from football-data.org
        @returns {dict} Enriched match data with statistics, goals, lineups
        """
        if not match_data:
            return match_data

        status = match_data.get("status", "")
        # Only fetch stats for matches that have started or finished
        if status not in ("FINISHED", "IN_PLAY", "PAUSED", "LIVE", "AWARDED"):
            return match_data

        # Skip if the match already has statistics (unlikely on free tier, but be safe)
        if match_data.get("homeTeam", {}).get("statistics"):
            return match_data

        home_team = (
            match_data.get("homeTeam", {}).get("shortName")
            or match_data.get("homeTeam", {}).get("name")
            or ""
        )
        away_team = (
            match_data.get("awayTeam", {}).get("shortName")
            or match_data.get("awayTeam", {}).get("name")
            or ""
        )

        if not home_team or not away_team:
            return match_data

        # Extract match date
        utc_date = match_data.get("utcDate", "")
        match_date = utc_date[:10] if utc_date else datetime.now().strftime("%Y-%m-%d")

        # Extract score
        score = match_data.get("score", {})
        ft = score.get("fullTime", {})
        score_home = ft.get("home", 0) or 0
        score_away = ft.get("away", 0) or 0

        ai_data = AIStatsService.get_match_stats(
            home_team, away_team, match_date, score_home, score_away
        )

        if not ai_data:
            return match_data

        # Merge statistics into homeTeam/awayTeam structure
        stats = ai_data.get("statistics", {})
        if stats:
            home_stats = {}
            away_stats = {}
            for key, val in stats.items():
                if isinstance(val, dict):
                    home_stats[key] = val.get("home", 0)
                    away_stats[key] = val.get("away", 0)

            if "homeTeam" not in match_data:
                match_data["homeTeam"] = {}
            if "awayTeam" not in match_data:
                match_data["awayTeam"] = {}

            match_data["homeTeam"]["statistics"] = home_stats
            match_data["awayTeam"]["statistics"] = away_stats

        # Merge goals if not present
        if not match_data.get("goals") and ai_data.get("goals"):
            ai_goals = ai_data["goals"]
            formatted_goals = []
            for goal in ai_goals:
                home_id = match_data.get("homeTeam", {}).get("id", 0)
                away_id = match_data.get("awayTeam", {}).get("id", 0)
                team_side = goal.get("team", "home")
                formatted_goals.append({
                    "minute": goal.get("minute", 0),
                    "scorer": {"name": goal.get("scorer", "Unknown")},
                    "assist": {"name": goal.get("assist")} if goal.get("assist") else None,
                    "team": {"id": home_id if team_side == "home" else away_id},
                    "type": goal.get("type", "REGULAR"),
                })
            match_data["goals"] = formatted_goals

        # Merge lineups if not present
        lineups = ai_data.get("lineups", {})
        if lineups:
            for side in ("home", "away"):
                team_key = "homeTeam" if side == "home" else "awayTeam"
                lineup_data = lineups.get(side, {})

                if team_key not in match_data:
                    match_data[team_key] = {}

                team = match_data[team_key]

                # Only set lineup if not already present
                if not team.get("lineup") and lineup_data.get("startingXI"):
                    team["lineup"] = [
                        {
                            "name": p.get("name", ""),
                            "shirtNumber": p.get("number"),
                            "position": p.get("position", ""),
                        }
                        for p in lineup_data["startingXI"]
                    ]

                if not team.get("formation") and lineup_data.get("formation"):
                    team["formation"] = lineup_data["formation"]

                if not team.get("coach") and lineup_data.get("coach"):
                    team["coach"] = {"name": lineup_data["coach"]}

        # Mark that this data came from AI lookup
        match_data["_ai_enriched"] = True
        match_data["_ai_source"] = "gemini_google_search"

        return match_data

    @staticmethod
    def clear_cache():
        """
        Clear the in-memory stats cache.
        @returns {int} Number of entries cleared
        """
        count = len(_stats_cache)
        _stats_cache.clear()
        return count
