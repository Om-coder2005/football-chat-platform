import os
import json
import re
from datetime import datetime
from urllib.parse import urlparse

import requests
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from sqlalchemy import or_
from src.db.connection import db_session
from src.db.models.new_models import TransferRumor, RumorRating
from src.services.match_service import MatchService

transfer_bp = Blueprint('transfer', __name__)
TRANSFER_IMPORTER_VERSION = "soccer-transfer-ai-refinement-v5"
TRANSFER_IMPORT_SOURCE = f"newsapi:{TRANSFER_IMPORTER_VERSION}"


def _get_json():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def _parse_newsapi_date(value):
    if not value:
        return datetime.utcnow()
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return datetime.utcnow()


TRANSFER_TERMS = (
    "transfer", "signing", "signs", "set to sign", "personal terms",
    "loan move", "bid", "release clause", "medical", "contract talks",
    "target", "targets", "targeting", "agrees deal", "join", "joins",
    "linked with", "interested in", "interest in", "chase", "chasing",
    "eye", "eyes", "plot", "swoop", "race for", "move for", "talks",
    "wanted", "pursuit", "rumour", "rumor", "pursue", "pursuing",
    "monitoring", "scouting", "approach", "offer", "deal", "clause",
    "swap", "hijack", "exit", "departure", "leaves", "leave",
    "agreement", "set for", "closing in", "weighing up", "asking price",
    "price tag", "valuation", "market value", "valued at", "worth",
    "demand", "demands", "appoint", "appointed", "appointment", "managerial",
    "head coach", "coach move",
)

SOCCER_TERMS = (
    "soccer", "football", "premier league", "champions league", "europa league",
    "la liga", "laliga", "serie a", "bundesliga", "ligue 1", "uefa", "fifa",
    "fc ", " afc", "cf ", "club", "manager", "striker", "midfielder",
    "defender", "goalkeeper", "arsenal", "chelsea", "liverpool",
    "manchester united", "manchester city", "tottenham", "barcelona",
    "real madrid", "atletico", "juventus", "inter milan", "ac milan",
    "bayern", "dortmund", "psg", "ajax", "benfica", "porto",
)

AMERICAN_FOOTBALL_TERMS = (
    "nfl", "american football", "quarterback", "wide receiver", "running back",
    "linebacker", "cornerback", "tight end", "touchdown", "super bowl",
    "college football", "draft pick", "nfl draft", "gridiron",
)

SOCCER_SOURCE_HINTS = (
    "bbc sport", "sky sports", "goal", "espn", "football365", "teamtalk",
    "90min", "caughtoffside", "the athletic", "marca", "football london",
    "tribal football", "onefootball", "transfermarkt",
)

SOCCER_DOMAIN_HINTS = (
    "skysports.com",
    "bbc.co.uk",
    "bbc.com",
    "goal.com",
    "espn.com",
    "football365.com",
    "teamtalk.com",
    "90min.com",
    "caughtoffside.com",
    "marca.com",
    "football.london",
    "onefootball.com",
    "transfermarkt.com",
)

CLUB_ALIASES = {
    "Arsenal": ["arsenal", "gunners"],
    "Chelsea": ["chelsea", "blues"],
    "Liverpool": ["liverpool", "reds"],
    "Manchester United": ["manchester united", "man utd", "man united", "red devils"],
    "Manchester City": ["manchester city", "man city"],
    "Tottenham": ["tottenham", "spurs"],
    "Newcastle United": ["newcastle", "newcastle united"],
    "Aston Villa": ["aston villa"],
    "West Ham": ["west ham"],
    "Barcelona": ["barcelona", "barca"],
    "Real Madrid": ["real madrid"],
    "Atletico Madrid": ["atletico madrid", "atletico"],
    "Juventus": ["juventus", "juve"],
    "Inter Milan": ["inter milan", "inter"],
    "AC Milan": ["ac milan", "milan"],
    "Bayern Munich": ["bayern munich", "bayern"],
    "Borussia Dortmund": ["borussia dortmund", "dortmund"],
    "PSG": ["psg", "paris saint-germain", "paris st-germain"],
    "Ajax": ["ajax"],
    "Benfica": ["benfica"],
    "Porto": ["porto"],
    "Napoli": ["napoli"],
    "Roma": ["roma"],
    "Bayer Leverkusen": ["bayer leverkusen", "leverkusen"],
    "Sporting CP": ["sporting cp", "sporting"],
}

PERSON_EXCLUSIONS = {
    "Premier League", "Champions League", "Europa League", "La Liga", "Serie A",
    "Ligue 1", "Bundesliga", "Transfer News", "Football News", "Newsapi",
    "Sky Sports", "Bbc Sport", "Manchester United", "Manchester City",
    "Real Madrid", "Atletico Madrid", "Inter Milan", "Ac Milan", "Bayern Munich",
    "Borussia Dortmund", "Aston Villa", "West Ham", "Newcastle United",
}

UNKNOWN_CURRENT_VALUES = {
    "",
    "unknown",
    "not specified",
    "not specified in article",
    "not stated",
    "not stated in article",
    "unspecified",
    "n/a",
    "none",
}

VAGUE_CLUB_REFERENCES = (
    "another premier league",
    "premier league heavyweight",
    "premier league heavyweights",
    "premier league club",
    "premier league clubs",
    "european heavyweight",
    "european heavyweights",
    "european giant",
    "european giants",
    "top european",
    "top club",
    "top clubs",
    "unnamed club",
    "unknown club",
    "mystery club",
    "saudi club",
    "saudi clubs",
    "mls club",
    "rival club",
    "another club",
    "new home",
    "heavyweight",
    "giants",
)

POSITION_TERMS = (
    "player",
    "star",
    "captain",
    "striker",
    "forward",
    "winger",
    "midfielder",
    "defender",
    "centre-back",
    "center-back",
    "full-back",
    "fullback",
    "goalkeeper",
    "keeper",
)


def _article_text(article):
    return " ".join([
        str(article.get("title") or ""),
        str(article.get("description") or ""),
        str(article.get("content") or ""),
        str((article.get("source") or {}).get("name") or ""),
    ]).lower()


def _article_display_text(article):
    return " ".join([
        str(article.get("title") or ""),
        str(article.get("description") or ""),
        str(article.get("content") or ""),
    ]).strip()


def _club_alias_pattern(alias):
    escaped = re.escape(alias.strip().lower()).replace(r"\ ", r"\s+")
    return rf"(?<![a-z0-9]){escaped}(?![a-z0-9])"


def _alias_in_text(text, alias):
    return re.search(_club_alias_pattern(alias), text.lower()) is not None


def _mentioned_clubs(text):
    lowered = text.lower()
    clubs = []
    for club, aliases in CLUB_ALIASES.items():
        if any(_alias_in_text(lowered, alias) for alias in aliases):
            clubs.append(club)
    return clubs[:4]


def _club_key(value):
    lowered = str(value or "").lower()
    lowered = re.sub(r"\b(football club|fc|cf|afc)\b", "", lowered)
    return re.sub(r"[^a-z0-9]+", "", lowered)


def _canonical_club(value):
    cleaned = str(value or "").strip(" .,-")
    key = _club_key(cleaned)
    if not key:
        return ""

    for club, aliases in CLUB_ALIASES.items():
        if key == _club_key(club):
            return club
        if any(key == _club_key(alias) for alias in aliases):
            return club
    return cleaned


def _same_club(left, right):
    left_canonical = _canonical_club(left)
    right_canonical = _canonical_club(right)
    if not left_canonical or not right_canonical:
        return False
    return _club_key(left_canonical) == _club_key(right_canonical)


def _is_unknown_current(value):
    lowered = re.sub(r"\s+", " ", str(value or "").strip().lower())
    return lowered in UNKNOWN_CURRENT_VALUES or lowered.startswith("not specified")


def _is_vague_club_reference(value):
    lowered = re.sub(r"\s+", " ", str(value or "").strip(" .,-").lower())
    if not lowered or lowered in {"club", "clubs"}:
        return True
    return any(term in lowered for term in VAGUE_CLUB_REFERENCES)


def _clean_interested_clubs(clubs, current_club=""):
    cleaned = []
    seen = set()

    for club in clubs or []:
        if _is_vague_club_reference(club):
            continue

        canonical = _canonical_club(club)
        if not canonical or _is_vague_club_reference(canonical):
            continue
        if current_club and _same_club(canonical, current_club):
            continue

        key = _club_key(canonical)
        if key and key not in seen:
            seen.add(key)
            cleaned.append(canonical[:100])

    return cleaned[:4]


def _split_club_list(value):
    return [
        club.strip()
        for club in re.split(r"\s*,\s*", str(value or ""))
        if club.strip()
    ]


def _club_profile(name, cache):
    canonical = _canonical_club(name)
    if not canonical:
        return None

    key = _club_key(canonical)
    if key not in cache:
        profile = MatchService.get_team_profile_by_name(canonical) or {}
        cache[key] = {
            "name": profile.get("name") or canonical,
            "shortName": profile.get("shortName") or profile.get("name") or canonical,
            "crest": profile.get("crest"),
            "id": profile.get("id"),
        }
    return cache[key]


def _club_profiles_from_text(value, cache):
    profiles = []
    seen = set()
    for club in _split_club_list(value):
        profile = _club_profile(club, cache)
        if not profile:
            continue
        key = _club_key(profile.get("name"))
        if key and key not in seen:
            seen.add(key)
            profiles.append(profile)
    return profiles


def _infer_current_club(article, player_name=""):
    text = _article_display_text(article)
    lowered = text.lower()
    player_pattern = ""
    if player_name:
        player_pattern = re.escape(player_name.lower()).replace(r"\ ", r"\s+")

    position_pattern = "|".join(re.escape(term) for term in POSITION_TERMS)

    for club, aliases in CLUB_ALIASES.items():
        for alias in (club.lower(), *aliases):
            alias_pattern = _club_alias_pattern(alias)
            phrase_patterns = [
                rf"(?:not\s+)?(?:return|returns|returning)\s+to\s+{alias_pattern}",
                rf"(?:future|contract|situation)\s+(?:is\s+)?(?:at|with)\s+{alias_pattern}",
                rf"(?:leave|leaves|leaving|exit|exits|depart|departs|departing)\s+(?:from\s+)?{alias_pattern}",
                rf"{alias_pattern}\s+(?:exit|departure|future)",
                rf"{alias_pattern}\s+(?:{position_pattern})\b",
            ]
            if player_pattern:
                phrase_patterns.extend([
                    rf"{alias_pattern}(?:'s|’s)\s+{player_pattern}",
                    rf"{alias_pattern}(?:'s|’s)\s+(?:{position_pattern})\s+{player_pattern}",
                    rf"{player_pattern}\s+(?:of|at|with)\s+{alias_pattern}",
                ])

            if any(re.search(pattern, lowered) for pattern in phrase_patterns):
                return club

    return ""


def _clean_player_candidate(candidate):
    cleaned = re.sub(r"\s+", " ", candidate or "").strip(" -:,.|")
    cleaned = re.sub(r"'s$", "", cleaned)
    if not cleaned or len(cleaned) > 60:
        return ""
    if cleaned.lower() in {name.lower() for name in PERSON_EXCLUSIONS}:
        return ""
    if cleaned in PERSON_EXCLUSIONS:
        return ""
    lowered = cleaned.lower()
    if any(alias == lowered for aliases in CLUB_ALIASES.values() for alias in aliases):
        return ""
    words = cleaned.split()
    if len(words) < 2 or len(words) > 4:
        return ""
    return cleaned


def _heuristic_extract_transfer_items(article):
    text = _article_display_text(article)
    clubs = _mentioned_clubs(text)
    if not clubs:
        return []

    name_pattern = r"([A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’-]+(?:\s+[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’-]+){1,3})"
    transfer_pattern = (
        r"(?:sign|signing|bid for|move for|target|targeting|chase|chasing|eye|eyes|"
        r"plot|swoop for|interested in|linked with|want|wanted|race for|talks over|"
        r"deal for|approach for)\s+"
    )
    candidates = []
    for pattern in [
        transfer_pattern + name_pattern,
        name_pattern + r"\s+(?:transfer|move|deal|bid|loan|signing|future|interest|talks)",
        name_pattern + r"\s+to\s+(?:" + "|".join(re.escape(club) for club in CLUB_ALIASES.keys()) + r")",
    ]:
        candidates.extend(match.group(1) for match in re.finditer(pattern, text, flags=re.IGNORECASE))

    # Headline fallback: a named player near a mentioned club in a transfer-looking article.
    if not candidates:
        candidates.extend(re.findall(name_pattern, text))

    items = []
    seen = set()
    for candidate in candidates:
        player_name = _clean_player_candidate(candidate)
        if not player_name or player_name.lower() in seen:
            continue
        seen.add(player_name.lower())

        current_club = _infer_current_club(article, player_name)
        interested_clubs = _clean_interested_clubs(clubs, current_club)
        if not interested_clubs:
            continue

        items.append({
            "player_name": player_name[:100],
            "current_club": current_club[:100],
            "interested_clubs": interested_clubs,
            "summary": (article.get("description") or article.get("title") or "").strip()[:500],
            "confidence": 0.58,
        })
        if len(items) >= 3:
            break
    return items


def _is_trusted_soccer_source(article):
    source_name = str((article.get("source") or {}).get("name") or "").lower()
    host = urlparse(article.get("url") or "").netloc.lower().removeprefix("www.")
    return (
        any(source in source_name for source in SOCCER_SOURCE_HINTS)
        or any(domain in host for domain in SOCCER_DOMAIN_HINTS)
    )


def _soccer_transfer_rejection_reason(article):
    text = _article_text(article)
    if any(term in text for term in AMERICAN_FOOTBALL_TERMS):
        return "american_football_terms"
    if not any(term in text for term in TRANSFER_TERMS):
        return "no_transfer_language"
    if any(term in text for term in SOCCER_TERMS) or _is_trusted_soccer_source(article):
        return None
    return "no_soccer_context"


def _gemini_keys():
    return [
        key.strip()
        for key in (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").split(",")
        if key.strip()
    ]


def _parse_json_object(text):
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if match:
        cleaned = match.group(0)
    try:
        return json.loads(cleaned)
    except Exception:
        return None


def _gemini_generate_json(prompt):
    """Call Gemini directly and request JSON output for transfer refinement."""
    keys = _gemini_keys()
    if not keys:
        return None, "no_ai_key"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.0,
            "responseMimeType": "application/json",
        },
    }
    models = ("gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash")
    last_error = None

    for api_key in keys:
        for model in models:
            try:
                response = requests.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    params={"key": api_key},
                    json=payload,
                    timeout=20,
                )
                if response.status_code == 429:
                    last_error = "ai_rate_limited"
                    continue
                if response.status_code >= 400:
                    message = response.text[:180]
                    last_error = f"ai_http_{response.status_code}:{message}"
                    continue

                data = response.json()
                text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )
                parsed = _parse_json_object(text)
                if parsed is not None:
                    return parsed, None
                last_error = "ai_invalid_json"
            except requests.RequestException as exc:
                last_error = f"ai_request_error:{str(exc)[:120]}"
            except Exception as exc:
                last_error = f"ai_error:{str(exc)[:120]}"

    return None, last_error or "ai_error"


def _clean_money_field(value):
    cleaned = re.sub(r"\s+", " ", str(value or "")).strip(" .,-")
    if cleaned.lower() in {"", "unknown", "not specified", "not stated", "n/a", "none"}:
        return ""
    return cleaned[:50]


def _person_name_matches(search_name, extracted_name):
    search_tokens = [
        token for token in re.findall(r"[a-z0-9]+", str(search_name or "").lower())
        if len(token) > 1
    ]
    extracted_tokens = set(re.findall(r"[a-z0-9]+", str(extracted_name or "").lower()))
    if not search_tokens or not extracted_tokens:
        return False

    return all(token in extracted_tokens for token in search_tokens)


def _normalize_refined_item(item, article):
    player_name = str(
        item.get("player_name")
        or item.get("manager_name")
        or item.get("person_name")
        or item.get("name")
        or ""
    ).strip()
    current_club = str(item.get("current_club") or "").strip()
    if _is_unknown_current(current_club):
        current_club = _infer_current_club(article, player_name)
    else:
        current_club = _canonical_club(current_club)

    interested_clubs = [
        str(club).strip()
        for club in (item.get("interested_clubs") or item.get("destination_clubs") or [])
        if str(club).strip()
    ]
    interested_clubs = _clean_interested_clubs(interested_clubs, current_club)
    try:
        confidence = float(item.get("confidence", 0))
    except Exception:
        confidence = 0.0

    if not player_name or not interested_clubs or confidence < 0.55:
        return None

    status = str(item.get("transfer_status") or item.get("status") or "rumor").strip().lower()
    release_clause = _clean_money_field(item.get("release_clause"))
    transfer_value = _clean_money_field(item.get("transfer_value") or item.get("market_value"))
    asking_price = _clean_money_field(
        item.get("asking_price") or item.get("club_valuation") or item.get("expected_fee")
    )
    fee = _clean_money_field(
        item.get("estimated_fee") or item.get("fee") or asking_price or release_clause or transfer_value
    )
    summary = str(item.get("summary") or article.get("description") or article.get("title") or "").strip()

    return {
        "player_name": player_name[:100],
        "current_club": current_club[:100],
        "interested_clubs": interested_clubs[:4],
        "summary": summary[:500],
        "estimated_fee": fee,
        "release_clause": release_clause,
        "transfer_value": transfer_value,
        "asking_price": asking_price,
        "transfer_status": status[:40],
        "ai_confidence": round(min(max(confidence, 0.0), 1.0), 2),
    }


def _extract_transfer_items(article):
    """Extract structured transfer facts from one NewsAPI article without inventing fields."""
    title = (article.get("title") or "").strip()
    description = (article.get("description") or "").strip()
    content = (article.get("content") or "").strip()
    source_name = ((article.get("source") or {}).get("name") or "").strip()
    url = (article.get("url") or "").strip()

    prompt = f"""
You are the transfer-news refinement layer for a soccer fan app.

Task:
Convert source-backed association football / soccer transfer news into normalized card data.

Hard rules:
- "football" means British football / soccer only, anywhere in the world.
- Reject American football, NFL, college football, fantasy football, and non-transfer stories.
- Use only the article text below. Never invent clubs, players, fees, or statuses.
- Create an item only when a named player or manager and at least one interested, bidding, signing, loaning, appointing, or destination soccer club are explicitly named in the text.
- current_club means the player's current, parent, selling, returning, or leaving club, or the manager's current/recent club when stated.
- interested_clubs means clubs linked with interest, bids, signing, loaning, talks, pursuit, or destination.
- Never put the current club in interested_clubs just because it is mentioned.
- If text says "may not return to Chelsea", "future at Chelsea", "leaving Chelsea", "Chelsea midfielder", or "Chelsea's Enzo Fernandez", Chelsea is current_club, not an interested club.
- If the interested/destination club is vague, such as "another Premier League heavyweight", "European giants", "Saudi club", or "unnamed club", reject the item instead of guessing.
- If current_club is not explicitly stated but can be inferred from these source phrases, fill it. Otherwise use an empty string.
- release_clause means a contractual buyout/release clause only.
- transfer_value means the player's market value or article-stated valuation when the text describes value, not an offer.
- asking_price means the current/selling club's expected fee, demand, asking price, price tag, or valuation for selling the player.
- estimated_fee means a reported bid, offer, agreed fee, package, or likely transfer fee. If only one money figure exists, put it in the most specific matching field.
- If the article is a roundup/live blog, extract up to 5 distinct transfer items.
- Confidence must reflect how clearly the text supports the fields.

Return only JSON:
{{
  "is_soccer_transfer_article": true or false,
  "reject_reason": "empty when accepted, otherwise short reason",
  "items": [
    {{
      "player_name": "full player or manager name",
      "current_club": "current/selling club or empty string",
      "interested_clubs": ["interested/destination/bidding/signing club"],
      "transfer_status": "rumor | interest | bid | talks | agreed | signed | loan | rejected | contract | appointed",
      "estimated_fee": "reported bid, offer, agreed fee, package, or likely transfer fee exactly as stated, otherwise empty string",
      "release_clause": "release clause exactly as stated, otherwise empty string",
      "transfer_value": "market value or valuation exactly as stated, otherwise empty string",
      "asking_price": "selling club asking price/demand/expected fee exactly as stated, otherwise empty string",
      "summary": "one source-grounded sentence, max 220 characters",
      "confidence": 0.0
    }}
  ]
}}

Article:
Source: {source_name}
URL: {url}
Title: {title}
Description: {description}
Content: {content}
"""

    extracted, ai_error = _gemini_generate_json(prompt)
    if extracted:
        accepted = (
            extracted.get("is_soccer_transfer_article")
            if "is_soccer_transfer_article" in extracted
            else extracted.get("is_football_transfer")
        )
        if not accepted:
            fallback_items = _heuristic_extract_transfer_items(article)
            return fallback_items, None if fallback_items else (extracted.get("reject_reason") or "ai_rejected")

        items = [
            normalized
            for normalized in (
                _normalize_refined_item(item, article)
                for item in (extracted.get("items") or [])
            )
            if normalized
        ]
        if items:
            return items, None
        fallback_items = _heuristic_extract_transfer_items(article)
        return fallback_items, None if fallback_items else "no_extractable_items"

    fallback_items = _heuristic_extract_transfer_items(article)
    if fallback_items:
        return fallback_items, None

    safe_error = re.sub(r"key=[^\\s,]+", "key=<redacted>", (ai_error or "ai_error"))[:160]
    return [], safe_error


def _rumor_card_payload(rumor, club_profile_cache, user_id=None):
    reliable_count = sum(1 for v in rumor.ratings if v.rating == 'reliable')
    fake_news_count = sum(1 for v in rumor.ratings if v.rating == 'fake_news')
    overpriced_count = sum(1 for v in rumor.ratings if v.rating == 'overpriced')
    masterclass_count = sum(1 for v in rumor.ratings if v.rating == 'masterclass')
    total_votes = reliable_count + fake_news_count + overpriced_count + masterclass_count
    user_rating = None
    if user_id:
        my_vote = next((v for v in rumor.ratings if v.user_id == user_id), None)
        if my_vote:
            user_rating = my_vote.rating

    rumor_dict = rumor.to_dict()
    rumor_dict.update({
        'reliable_count': reliable_count,
        'fake_news_count': fake_news_count,
        'overpriced_count': overpriced_count,
        'masterclass_count': masterclass_count,
        'total_votes': total_votes,
        'user_rating': user_rating,
        'current_club_meta': _club_profile(rumor.from_club, club_profile_cache),
        'interested_clubs_meta': _club_profiles_from_text(rumor.to_club, club_profile_cache),
    })
    return rumor_dict


@transfer_bp.route('/rumors', methods=['GET'])
def get_rumors():
    """Fetches paginated rumored transfers with consensus ratios."""
    try:
        limit = max(1, min(request.args.get('limit', 9, type=int), 50))
        offset = max(0, request.args.get('offset', 0, type=int))
        search_query = re.sub(r"\s+", " ", request.args.get('q', '').strip())[:80]

        with db_session() as db:
            base_query = db.query(TransferRumor)
            if search_query:
                search_pattern = f"%{search_query}%"
                base_query = base_query.filter(or_(
                    TransferRumor.player_name.ilike(search_pattern),
                    TransferRumor.details.ilike(search_pattern),
                    TransferRumor.source.ilike(search_pattern),
                    TransferRumor.from_club.ilike(search_pattern),
                    TransferRumor.to_club.ilike(search_pattern),
                ))
            total_count = base_query.count()
            rumors = (
                base_query
                .order_by(TransferRumor.created_at.desc())
                .limit(limit)
                .offset(offset)
                .all()
            )
            result = []
            club_profile_cache = {}

            # Try to read the current user from optional JWT
            curr_user_id = None
            try:
                verify_jwt_in_request(optional=True)
                raw = get_jwt_identity()
                if raw:
                    curr_user_id = int(raw)
            except Exception:
                pass

            for r in rumors:
                result.append(_rumor_card_payload(r, club_profile_cache, curr_user_id))

            next_offset = offset + len(result)
            return jsonify({
                'success': True,
                'count': len(result),
                'total_count': total_count,
                'limit': limit,
                'offset': offset,
                'next_offset': next_offset if next_offset < total_count else None,
                'has_more': next_offset < total_count,
                'rumors': result,
            }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@transfer_bp.route('/rumors', methods=['POST'])
@jwt_required()
def create_rumor():
    """Submits a new transfer rumor."""
    try:
        data        = _get_json()
        player_name = data.get('player_name', '').strip()
        from_club   = data.get('from_club', '').strip()
        to_club     = data.get('to_club', '').strip()

        if not player_name or not from_club or not to_club:
            return jsonify({
                'success': False,
                'message': 'Player name, current club, and destination club are required',
            }), 400

        user_id = int(get_jwt_identity())
        with db_session() as db:
            rumor = TransferRumor(
                player_name   = player_name,
                from_club     = from_club,
                to_club       = to_club,
                estimated_fee = data.get('estimated_fee', ''),
                release_clause = data.get('release_clause', ''),
                transfer_value = data.get('transfer_value', ''),
                asking_price = data.get('asking_price', ''),
                source        = data.get('source', ''),
                details       = data.get('details', ''),
                created_by    = user_id,
            )
            db.add(rumor)
            db.commit()
            db.refresh(rumor)

            club_profile_cache = {}
            rumor_dict = _rumor_card_payload(rumor, club_profile_cache, user_id)

            return jsonify({
                'success': True,
                'message': 'Transfer rumor created successfully!',
                'rumor':   rumor_dict,
            }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@transfer_bp.route('/rumors/search-news', methods=['POST'])
@jwt_required()
def search_transfer_news():
    """Search live transfer news for a named player or manager and return matching cards."""
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        return jsonify({
            'success': False,
            'message': 'NEWS_API_KEY is not configured on the backend.',
        }), 503

    user_id = int(get_jwt_identity())
    data = _get_json()
    search_name = re.sub(r"\s+", " ", str(data.get("query") or "").strip())[:80]
    page_size = max(1, min(int(data.get('page_size', 12) or 12), 25))
    if len(search_name) < 2:
        return jsonify({
            'success': False,
            'message': 'Enter a player or manager name to search.',
        }), 400

    query = (
        f'"{search_name}" '
        'AND ("soccer transfer" OR "football transfer" OR "transfer news" OR '
        '"transfer target" OR "linked with" OR "interested in" OR "bid" OR '
        '"release clause" OR "managerial appointment" OR "head coach" OR manager) '
        'AND (soccer OR football OR "Premier League" OR "La Liga" OR Bundesliga OR '
        '"Serie A" OR "Ligue 1" OR UEFA OR FIFA OR club) '
        'NOT NFL NOT "American football" NOT quarterback NOT "college football"'
    )

    try:
        response = requests.get(
            'https://newsapi.org/v2/everything',
            params={
                'q': query,
                'language': 'en',
                'sortBy': 'publishedAt',
                'pageSize': page_size,
                'apiKey': api_key,
            },
            timeout=12,
        )
        payload = response.json()
        if response.status_code != 200:
            return jsonify({
                'success': False,
                'message': payload.get('message') or 'NewsAPI request failed.',
            }), response.status_code

        imported = 0
        updated = 0
        rejected = 0
        skipped = 0
        cards = []
        rejection_reasons = {}

        with db_session() as db:
            for article in payload.get('articles') or []:
                title = (article.get('title') or '').strip()
                url = (article.get('url') or '').strip()
                if not title or not url:
                    skipped += 1
                    continue

                rejection_reason = _soccer_transfer_rejection_reason(article)
                if rejection_reason:
                    rejected += 1
                    rejection_reasons[rejection_reason] = rejection_reasons.get(rejection_reason, 0) + 1
                    continue

                source_name = ((article.get('source') or {}).get('name') or 'NewsAPI').strip()
                extracted_items, extraction_reason = _extract_transfer_items(article)
                matching_items = [
                    item for item in extracted_items
                    if _person_name_matches(search_name, item.get("player_name"))
                ]
                if not matching_items:
                    rejected += 1
                    reason = extraction_reason or "no_matching_person"
                    rejection_reasons[reason] = rejection_reasons.get(reason, 0) + 1
                    continue

                for extracted in matching_items:
                    interested_text = ", ".join(extracted["interested_clubs"])
                    existing = db.query(TransferRumor).filter(
                        TransferRumor.article_url == url,
                        TransferRumor.player_name == extracted["player_name"],
                    ).first()
                    if existing:
                        existing.from_club = extracted["current_club"]
                        existing.to_club = interested_text[:100]
                        existing.estimated_fee = extracted.get("estimated_fee", "")
                        existing.release_clause = extracted.get("release_clause", "")
                        existing.transfer_value = extracted.get("transfer_value", "")
                        existing.asking_price = extracted.get("asking_price", "")
                        existing.source = source_name[:100]
                        existing.details = extracted["summary"]
                        existing.import_source = TRANSFER_IMPORT_SOURCE
                        existing.transfer_status = extracted.get("transfer_status", "rumor")
                        existing.ai_confidence = extracted.get("ai_confidence")
                        updated += 1
                        cards.append(existing)
                        continue

                    rumor = TransferRumor(
                        player_name=extracted["player_name"],
                        from_club=extracted["current_club"],
                        to_club=interested_text[:100],
                        estimated_fee=extracted.get("estimated_fee", ""),
                        release_clause=extracted.get("release_clause", ""),
                        transfer_value=extracted.get("transfer_value", ""),
                        asking_price=extracted.get("asking_price", ""),
                        source=source_name[:100],
                        details=extracted["summary"],
                        article_url=url,
                        import_source=TRANSFER_IMPORT_SOURCE,
                        transfer_status=extracted.get("transfer_status", "rumor"),
                        ai_confidence=extracted.get("ai_confidence"),
                        created_by=user_id,
                        created_at=_parse_newsapi_date(article.get('publishedAt')),
                    )
                    db.add(rumor)
                    db.flush()
                    imported += 1
                    cards.append(rumor)

            db.commit()
            club_profile_cache = {}
            card_payloads = [_rumor_card_payload(card, club_profile_cache, user_id) for card in cards]

        return jsonify({
            'success': True,
            'message': f'Found {len(card_payloads)} transfer cards for {search_name}.',
            'query': search_name,
            'imported': imported,
            'updated': updated,
            'skipped': skipped,
            'rejected': rejected,
            'rejection_reasons': rejection_reasons,
            'rumors': card_payloads,
        }), 200
    except requests.RequestException as e:
        return jsonify({
            'success': False,
            'message': f'NewsAPI request error: {str(e)}',
        }), 502
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@transfer_bp.route('/rumors/import-news', methods=['POST'])
@jwt_required()
def import_transfer_news():
    """Import real transfer articles from NewsAPI into the transfer deck."""
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        return jsonify({
            'success': False,
            'message': 'NEWS_API_KEY is not configured on the backend.',
        }), 503

    user_id = int(get_jwt_identity())
    data = _get_json()
    page_size = max(1, min(int(data.get('page_size', 24) or 24), 50))
    query = (
        '("soccer transfer" OR "football transfer" OR "transfer news" OR "transfer target" '
        'OR "transfer latest" OR "set to sign" OR "agrees personal terms" OR "loan move" '
        'OR "bid for" OR "release clause") '
        'AND (soccer OR "Premier League" OR "La Liga" OR Bundesliga OR "Serie A" '
        'OR "Ligue 1" OR UEFA OR FIFA OR "Champions League" OR Arsenal OR Chelsea '
        'OR Liverpool OR "Manchester United" OR "Manchester City" OR Barcelona OR "Real Madrid") '
        'NOT NFL NOT "American football" NOT quarterback NOT "college football"'
    )

    try:
        response = requests.get(
            'https://newsapi.org/v2/everything',
            params={
                'q': query,
                'language': 'en',
                'sortBy': 'publishedAt',
                'pageSize': page_size,
                'apiKey': api_key,
            },
            timeout=12,
        )
        payload = response.json()
        if response.status_code != 200:
            return jsonify({
                'success': False,
                'message': payload.get('message') or 'NewsAPI request failed.',
            }), response.status_code

        articles = payload.get('articles') or []
        imported = 0
        updated = 0
        skipped = 0
        rejected = 0
        rejection_reasons = {}

        with db_session() as db:
            for article in articles:
                title = (article.get('title') or '').strip()
                url = (article.get('url') or '').strip()
                if not title or not url:
                    skipped += 1
                    continue

                rejection_reason = _soccer_transfer_rejection_reason(article)
                if rejection_reason:
                    rejected += 1
                    rejection_reasons[rejection_reason] = rejection_reasons.get(rejection_reason, 0) + 1
                    continue

                existing_url_rows = db.query(TransferRumor).filter(
                    TransferRumor.article_url == url
                ).all()
                if existing_url_rows and all(
                    row.import_source == TRANSFER_IMPORT_SOURCE for row in existing_url_rows
                ):
                    skipped += 1
                    continue

                source_name = ((article.get('source') or {}).get('name') or 'NewsAPI').strip()
                extracted_items, extraction_reason = _extract_transfer_items(article)
                if not extracted_items:
                    rejected += 1
                    reason = extraction_reason or "no_extractable_items"
                    rejection_reasons[reason] = rejection_reasons.get(reason, 0) + 1
                    continue

                for extracted in extracted_items:
                    interested_text = ", ".join(extracted["interested_clubs"])
                    existing = db.query(TransferRumor).filter(
                        TransferRumor.article_url == url,
                        TransferRumor.player_name == extracted["player_name"],
                    ).first()
                    if existing:
                        existing.from_club = extracted["current_club"]
                        existing.to_club = interested_text[:100]
                        existing.estimated_fee = extracted.get("estimated_fee", "")
                        existing.release_clause = extracted.get("release_clause", "")
                        existing.transfer_value = extracted.get("transfer_value", "")
                        existing.asking_price = extracted.get("asking_price", "")
                        existing.source = source_name[:100]
                        existing.details = extracted["summary"]
                        existing.import_source = TRANSFER_IMPORT_SOURCE
                        existing.transfer_status = extracted.get("transfer_status", "rumor")
                        existing.ai_confidence = extracted.get("ai_confidence")
                        updated += 1
                        continue

                    db.add(TransferRumor(
                        player_name=extracted["player_name"],
                        from_club=extracted["current_club"],
                        to_club=interested_text[:100],
                        estimated_fee=extracted.get("estimated_fee", ""),
                        release_clause=extracted.get("release_clause", ""),
                        transfer_value=extracted.get("transfer_value", ""),
                        asking_price=extracted.get("asking_price", ""),
                        source=source_name[:100],
                        details=extracted["summary"],
                        article_url=url,
                        import_source=TRANSFER_IMPORT_SOURCE,
                        transfer_status=extracted.get("transfer_status", "rumor"),
                        ai_confidence=extracted.get("ai_confidence"),
                        created_by=user_id,
                        created_at=_parse_newsapi_date(article.get('publishedAt')),
                    ))
                    imported += 1

            db.commit()

        return jsonify({
            'success': True,
            'message': f'Imported {imported} and updated {updated} football transfer articles.',
            'importer_version': TRANSFER_IMPORTER_VERSION,
            'imported': imported,
            'updated': updated,
            'skipped': skipped,
            'rejected': rejected,
            'rejection_reasons': rejection_reasons,
        }), 200
    except requests.RequestException as e:
        return jsonify({
            'success': False,
            'message': f'NewsAPI request error: {str(e)}',
        }), 502
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@transfer_bp.route('/rumors/<int:rumor_id>/rate', methods=['POST'])
@jwt_required()
def rate_rumor(rumor_id):
    """Casts or updates a consensus rating (1 vote per user per card)."""
    try:
        data   = _get_json()
        rating = data.get('rating', '').strip()

        VALID_RATINGS = {'reliable', 'fake_news', 'masterclass', 'overpriced'}
        if rating not in VALID_RATINGS:
            return jsonify({
                'success': False,
                'message': f'Valid rating required: {", ".join(VALID_RATINGS)}',
            }), 400

        user_id = int(get_jwt_identity())
        with db_session() as db:
            rumor = db.query(TransferRumor).filter(TransferRumor.id == rumor_id).first()
            if not rumor:
                return jsonify({'success': False, 'message': 'Transfer rumor not found'}), 404

            existing = db.query(RumorRating).filter_by(
                rumor_id=rumor_id, user_id=user_id
            ).first()

            if existing:
                existing.rating = rating
                msg = 'Vote updated!'
            else:
                db.add(RumorRating(rumor_id=rumor_id, user_id=user_id, rating=rating))
                msg = 'Vote registered!'
            db.commit()

            # Re-calculate counts
            ratings           = db.query(RumorRating).filter_by(rumor_id=rumor_id).all()
            reliable_count    = sum(1 for v in ratings if v.rating == 'reliable')
            fake_news_count   = sum(1 for v in ratings if v.rating == 'fake_news')
            overpriced_count  = sum(1 for v in ratings if v.rating == 'overpriced')
            masterclass_count = sum(1 for v in ratings if v.rating == 'masterclass')

            return jsonify({
                'success': True,
                'message': msg,
                'rating':  rating,
                'counts':  {
                    'reliable':    reliable_count,
                    'fake_news':   fake_news_count,
                    'overpriced':  overpriced_count,
                    'masterclass': masterclass_count,
                    'total_votes': len(ratings),
                },
            }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
