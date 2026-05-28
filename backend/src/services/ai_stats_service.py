import os
import json
import logging
import hashlib
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# In-memory caches
_scorers_cache: dict = {}    # {cache_key: data}  — permanent for finished matches
_stats_cache:   dict = {}    # {cache_key: data}
_key_cooldown:  dict = {}    # {api_key: cooldown_until_timestamp}

MAX_CACHE_SIZE = 300

try:
    from src.services.api_football_service import APIFootballService
    _api_football_available = True
except Exception:
    _api_football_available = False

try:
    from google import genai
    from google.genai import types
    _gemini_available = True
except Exception:
    _gemini_available = False


class AIStatsService:
    """
    Enriches football-data.org match objects with goal scorers, bookings,
    lineup data and statistics.

    Source priority:
      1. Native football-data.org fields  (goals / bookings arrays)
      2. API-Football                      (lineups)
      3. Gemini AI with Google Search      (goal scorers when native is empty)
         → Skipped if all keys are rate-limited or exhausted

    Gemini optimisations:
      • Per-key cooldown: a 429 response mutes that key for 90 s
      • Permanent cache: finished match data never changes
      • Focused prompt: only asks for scorers/cards/lineups (not full stats)
    """

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""

    # ------------------------------------------------------------------ #
    #  Key management                                                      #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _keys() -> list[str]:
        return [k.strip() for k in AIStatsService.GEMINI_API_KEY.split(",") if k.strip()]

    @staticmethod
    def _available_keys() -> list[str]:
        """Return keys that are not currently on cooldown."""
        now = time.time()
        return [k for k in AIStatsService._keys() if now >= _key_cooldown.get(k, 0)]

    @staticmethod
    def _set_cooldown(key: str, seconds: int = 90):
        _key_cooldown[key] = time.time() + seconds
        logger.warning("Gemini key ending …%s on cooldown for %ds", key[-8:], seconds)

    # ------------------------------------------------------------------ #
    #  Internal helpers                                                    #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _cache_key(*parts) -> str:
        raw = "_".join(str(p).lower().strip() for p in parts)
        return hashlib.sha256(raw.encode()).hexdigest()

    @staticmethod
    def _parse_json(text: str) -> dict | None:
        if not text:
            return None
        t = text.strip()
        if t.startswith("```"):
            t = "\n".join(l for l in t.split("\n") if not l.strip().startswith("```"))
        try:
            return json.loads(t)
        except json.JSONDecodeError:
            s, e = t.find("{"), t.rfind("}") + 1
            if s >= 0 and e > s:
                try:
                    return json.loads(t[s:e])
                except json.JSONDecodeError:
                    pass
        logger.error("Could not parse JSON from Gemini: %.300s", text)
        return None

    @staticmethod
    def _gemini_call(prompt: str, use_search: bool = True) -> str | None:
        """
        Try each available (non-cooldown) Gemini key in order.
        Handles 429 by setting a per-key cooldown.
        Returns the raw response text or None.
        """
        if not _gemini_available:
            return None

        keys = AIStatsService._available_keys()
        if not keys:
            logger.info("All Gemini keys are on cooldown – skipping AI call")
            return None

        for i, api_key in enumerate(keys):
            try:
                client = genai.Client(api_key=api_key)
                safety_settings = [
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                    )
                ]
                if use_search:
                    tool   = types.Tool(google_search=types.GoogleSearch())
                    config = types.GenerateContentConfig(tools=[tool], temperature=0.0, safety_settings=safety_settings)
                else:
                    config = types.GenerateContentConfig(temperature=0.4, safety_settings=safety_settings)

                resp = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt,
                    config=config,
                )
                return resp.text.strip()

            except Exception as exc:
                msg = str(exc)
                if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                    # Parse retry delay hint from response
                    try:
                        delay = int(
                            msg.split("retryDelay")[1].split('"')[1].replace("s", "")
                        )
                    except Exception:
                        delay = 90
                    AIStatsService._set_cooldown(api_key, delay + 5)
                    continue   # try next key
                elif "API key not valid" in msg or '"400"' in msg:
                    AIStatsService._set_cooldown(api_key, 3600)  # invalid key – mute for 1 h
                    continue
                else:
                    logger.error("Gemini error (key %d/%d): %.200s", i + 1, len(keys), msg)
                    break      # unexpected error – stop
        return None

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    @staticmethod
    def get_goal_scorers(home_team: str, away_team: str, match_date: str,
                          score_home: int, score_away: int) -> dict | None:
        """
        Ask Gemini to find who scored, with bookings and lineups.
        Only called when native API has no goal data.
        Results are permanently cached for finished matches.
        """
        ck = AIStatsService._cache_key(home_team, away_team, match_date, "scorers")
        if ck in _scorers_cache:
            entry = _scorers_cache[ck]
            if isinstance(entry, dict) and entry.get("_cooldown_until"):
                if time.time() < entry["_cooldown_until"]:
                    return None
            else:
                logger.info("Scorer cache hit: %s vs %s", home_team, away_team)
                return entry

        if not AIStatsService._available_keys():
            logger.info("No available Gemini keys – skipping scorer lookup")
            return None

        prompt = (
            f"Find the goal scorers for the football match "
            f"{home_team} vs {away_team} on {match_date}. "
            f"Score: {home_team} {score_home} – {score_away} {away_team}.\n\n"
            "Search SofaScore, BBC Sport, ESPN, or any reliable football results site.\n\n"
            "Return ONLY valid JSON (no markdown):\n"
            '{"goals":['
            '{"minute":<int>,"scorer":"<full name>","team":"home" or "away",'
            '"type":"REGULAR" or "PENALTY" or "OWN_GOAL","assist":"<name or null>"}],'
            '"bookings":['
            '{"minute":<int>,"player":"<full name>","team":"home" or "away","card":"YELLOW" or "RED"}],'
            '"lineups":{'
            '"home":{"formation":"<4-3-3 etc>","players":['
            '{"name":"<name>","number":<int>,"position":"GK/DF/MF/FW"}]},'
            '"away":{"formation":"<4-4-2 etc>","players":['
            '{"name":"<name>","number":<int>,"position":"GK/DF/MF/FW"}]}}}'
        )

        raw_text = AIStatsService._gemini_call(prompt, use_search=True)
        if not raw_text:
            logger.error("Gemini scorers fetch failed: %s", raw_text)
            _scorers_cache[ck] = {"_cooldown_until": time.time() + 120}
            return None

        data = AIStatsService._parse_json(raw_text)

        if data:
            if len(_scorers_cache) >= MAX_CACHE_SIZE:
                _scorers_cache.pop(next(iter(_scorers_cache)))
            _scorers_cache[ck] = data
            logger.info("Scorer data cached for %s vs %s", home_team, away_team)

        return data

    @staticmethod
    def get_match_stats(home_team, away_team, match_date, score_home, score_away):
        """Full possession/shots stats prompt – lower priority than scorers."""
        if not AIStatsService._available_keys():
            return None

        ck = AIStatsService._cache_key(home_team, away_team, match_date, "fullstats")
        if ck in _stats_cache:
            entry = _stats_cache[ck]
            if isinstance(entry, dict) and entry.get("_cooldown_until"):
                if time.time() < entry["_cooldown_until"]:
                    return None
            else:
                return entry

        prompt = (
            f"Find match statistics for {home_team} vs {away_team} "
            f"on {match_date} (score: {score_home}–{score_away}).\n"
            "Return ONLY JSON:\n"
            '{"statistics":{"ball_possession":{"home":<n>,"away":<n>},'
            '"total_shots":{"home":<n>,"away":<n>},'
            '"shots_on_target":{"home":<n>,"away":<n>},'
            '"corner_kicks":{"home":<n>,"away":<n>},'
            '"fouls":{"home":<n>,"away":<n>}}}'
        )
        raw  = AIStatsService._gemini_call(prompt, use_search=True)
        if not raw:
            _stats_cache[ck] = {"_cooldown_until": time.time() + 120}
            return None

        data = AIStatsService._parse_json(raw)
        if data and "statistics" in data:
            if len(_stats_cache) >= MAX_CACHE_SIZE:
                _stats_cache.pop(next(iter(_stats_cache)))
            _stats_cache[ck] = data
            return data
        return None

    @staticmethod
    def enrich_match_data(match_data: dict) -> dict:
        """
        Enrich a football-data.org match object.

        Steps:
          0. Normalise native goals/bookings (fill team.name from team.id)
          1. If goals[] empty but score > 0 → try Gemini (if keys available)
          2. Try API-Football for lineups
          3. Try Gemini for possession stats (if keys available)
        """
        if not match_data:
            return match_data

        status = match_data.get("status", "")
        if status not in ("FINISHED", "IN_PLAY", "PAUSED", "LIVE", "AWARDED"):
            return match_data

        home_id    = match_data.get("homeTeam", {}).get("id")
        away_id    = match_data.get("awayTeam", {}).get("id")
        home_name  = match_data.get("homeTeam", {}).get("name", "")
        away_name  = match_data.get("awayTeam", {}).get("name", "")
        home_short = match_data.get("homeTeam", {}).get("shortName") or home_name
        away_short = match_data.get("awayTeam", {}).get("shortName") or away_name

        score   = match_data.get("score", {})
        ft      = score.get("fullTime", {})
        sh, sa  = (ft.get("home") or 0), (ft.get("away") or 0)

        utc_date   = match_data.get("utcDate", "")
        match_date = utc_date[:10] if utc_date else datetime.now().strftime("%Y-%m-%d")

        # ── STEP 0: Normalise native goals / bookings ─────────────────────
        for event in match_data.get("goals", []):
            t = event.get("team") or {}
            if not t.get("name"):
                t["name"] = home_name if t.get("id") == home_id else away_name
                event["team"] = t

        for event in match_data.get("bookings", []):
            t = event.get("team") or {}
            if not t.get("name"):
                t["name"] = home_name if t.get("id") == home_id else away_name
                event["team"] = t

        # ── STEPS 1 & 3: Run Gemini scorers and stats in parallel ──────
        native_goals = match_data.get("goals", [])
        total_goals  = sh + sa

        need_scorers = not native_goals and total_goals > 0 and home_short and away_short
        need_stats   = not match_data.get("homeTeam", {}).get("statistics")

        scorer_data = None
        ai_stats    = None

        if need_scorers or need_stats:
            with ThreadPoolExecutor(max_workers=2) as pool:
                scorer_future = (
                    pool.submit(AIStatsService.get_goal_scorers,
                                home_short, away_short, match_date, sh, sa)
                    if need_scorers else None
                )
                stats_future = (
                    pool.submit(AIStatsService.get_match_stats,
                                home_short, away_short, match_date, sh, sa)
                    if need_stats else None
                )

                if scorer_future:
                    try:
                        scorer_data = scorer_future.result(timeout=15)
                    except Exception as e:
                        logger.error("Gemini scorers fetch failed: %s", e)

                if stats_future:
                    try:
                        ai_stats = stats_future.result(timeout=15)
                    except Exception as e:
                        logger.error("Gemini stats fetch failed: %s", e)

        # Process scorer results (Step 1)
        if scorer_data:
            goals_out = []
            for g in scorer_data.get("goals", []):
                side = g.get("team", "home")
                goals_out.append({
                    "minute":  g.get("minute", 0),
                    "scorer":  {"name": g.get("scorer", "Unknown")},
                    "assist":  {"name": g.get("assist")} if g.get("assist") else None,
                    "team":    {
                        "id":   home_id if side == "home" else away_id,
                        "name": home_name if side == "home" else away_name,
                    },
                    "type": g.get("type", "REGULAR"),
                })
            if goals_out:
                match_data["goals"] = goals_out

            bookings_out = []
            for b in scorer_data.get("bookings", []):
                side = b.get("team", "home")
                bookings_out.append({
                    "minute": b.get("minute", 0),
                    "player": {"name": b.get("player", "Unknown")},
                    "team":   {
                        "id":   home_id if side == "home" else away_id,
                        "name": home_name if side == "home" else away_name,
                    },
                    "card": b.get("card", "YELLOW"),
                })
            if bookings_out and not match_data.get("bookings"):
                match_data["bookings"] = bookings_out

            lineups = scorer_data.get("lineups", {})
            for side, team_key in (("home", "homeTeam"), ("away", "awayTeam")):
                ld   = lineups.get(side, {})
                team = match_data.setdefault(team_key, {})
                if not team.get("lineup") and ld.get("players"):
                    team["lineup"] = [
                        {"name": p.get("name",""), "shirtNumber": p.get("number"),
                         "position": p.get("position","")}
                        for p in ld["players"]
                    ]
                if not team.get("formation") and ld.get("formation"):
                    team["formation"] = ld["formation"]

            match_data["_ai_enriched"] = True
            match_data["_ai_source"]   = "gemini_scorers"

        # ── STEP 2: API-Football for lineups ──────────────────────
        has_lineups = (
            match_data.get("homeTeam", {}).get("lineup") or
            match_data.get("awayTeam", {}).get("lineup")
        )
        if not has_lineups and _api_football_available:
            try:
                fid = APIFootballService.find_fixture_id(home_short, away_short, match_date)
                if fid:
                    lineups = APIFootballService.get_lineups(fid)
                    if lineups:
                        for side, team_key in (("home", "homeTeam"), ("away", "awayTeam")):
                            sname  = (home_short if side == "home" else away_short).lower()
                            l_data = next(
                                (l for l in lineups if sname in l.get("team",{}).get("name","").lower()),
                                None,
                            )
                            if l_data:
                                team = match_data.setdefault(team_key, {})
                                team["formation"] = l_data.get("formation")
                                team["lineup"]    = [
                                    {"name": p.get("player",{}).get("name"),
                                     "shirtNumber": p.get("player",{}).get("number"),
                                     "position": p.get("player",{}).get("pos")}
                                    for p in l_data.get("startXI", [])
                                ]
            except Exception as e:
                logger.error("API-Football lineup fetch failed: %s", e)

        # Process stats results (Step 3)
        if ai_stats:
            raw_s  = ai_stats.get("statistics", {})
            home_s, away_s = {}, {}
            for key, val in raw_s.items():
                if isinstance(val, dict):
                    home_s[key] = val.get("home", 0)
                    away_s[key] = val.get("away", 0)
            match_data.setdefault("homeTeam", {})["statistics"] = home_s
            match_data.setdefault("awayTeam", {})["statistics"] = away_s

        return match_data

    # ------------------------------------------------------------------ #
    #  Utilities                                                           #
    # ------------------------------------------------------------------ #

    @staticmethod
    def clear_cache():
        count = len(_stats_cache) + len(_scorers_cache)
        _stats_cache.clear()
        _scorers_cache.clear()
        _key_cooldown.clear()
        return count

    @staticmethod
    def generate_tactical_summary(match_data, chat_messages):
        if not AIStatsService._available_keys():
            return None
        msgs = "\n".join(f"{m.get('username','?')}: {m.get('content','')}" for m in chat_messages)
        info = json.dumps(match_data, indent=2) if match_data else "No data."
        prompt = (
            "You are a professional football analyst.\n"
            f"Match: {info}\n\nFan chat:\n{msgs}\n\n"
            'Return ONLY JSON: {"tactical_analysis":"...","fan_sentiment":"..."}'
        )
        raw = AIStatsService._gemini_call(prompt, use_search=False)
        if not raw:
            return None
        d = AIStatsService._parse_json(raw)
        return d if (d and "tactical_analysis" in d) else None

    @staticmethod
    def _parse_response(raw_text):
        """Alias kept for backward compatibility."""
        return AIStatsService._parse_json(raw_text)
