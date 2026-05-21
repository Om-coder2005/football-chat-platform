import feedparser
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from email.utils import parsedate_to_datetime
import time
import logging
from sqlalchemy.orm import Session
from src.db.models.club_news import ClubNews
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

# Predefined free RSS feeds for major football news
RSS_FEEDS = [
    "https://www.goal.com/feeds/en/news",
    "https://feeds.bbci.co.uk/sport/football/rss.xml",
    "https://www.espn.com/espn/rss/soccer/news",
    "https://www.skysports.com/rss/12040",
    "https://www.marca.com/en/rss.html"
]

# Keywords mapping for club filtering
CLUB_KEYWORDS = {
    "real madrid": ["real madrid", "madrid", "ancelotti", "vinicius", "mbappe", "bellingham", "los blancos"],
    "barcelona": ["barcelona", "barca", "yamal", "pedri", "flick", "blaugrana", "camp nou"],
    "chelsea": ["chelsea", "blues", "stamford bridge", "palmer", "maresca", "enzo"],
    "liverpool": ["liverpool", "reds", "anfield", "salah", "klopp", "slot", "van dijk"],
    "manchester united": ["manchester united", "man utd", "red devils", "old trafford", "ten hag", "rashford", "bruno"],
    "manchester city": ["manchester city", "man city", "pep", "guardiola", "haaland", "de bruyne", "etihad"],
    "arsenal": ["arsenal", "gunners", "arteta", "saka", "odegaard", "emirates"],
    "bayern munich": ["bayern", "munich", "kane", "kompany", "allianz"],
    "psg": ["psg", "paris saint-germain", "luis enrique", "parc des princes"],
    "juventus": ["juventus", "juve", "bianconeri", "vlahovic"],
    "ac milan": ["ac milan", "rossoneri", "leao", "pioli"],
    "inter milan": ["inter", "nerazzurri", "lautaro", "inzaghi"]
}

class NewsService:
    
    @staticmethod
    def _extract_image_from_entry(entry):
        # Try different common locations for images in RSS feeds
        if hasattr(entry, 'media_content') and len(entry.media_content) > 0:
            return entry.media_content[0].get('url')
        if hasattr(entry, 'media_thumbnail') and len(entry.media_thumbnail) > 0:
            return entry.media_thumbnail[0].get('url')
        if hasattr(entry, 'links'):
            for link in entry.links:
                if link.get('type') and 'image' in link.get('type'):
                    return link.get('href')
        # Check description for img tags
        if hasattr(entry, 'description'):
            soup = BeautifulSoup(entry.description, 'html.parser')
            img = soup.find('img')
            if img and img.get('src'):
                return img.get('src')
        return None

    @staticmethod
    def fetch_and_store_news(db: Session):
        """Fetch news from all RSS feeds and store relevant ones in the DB."""
        logger.info("Starting background job to fetch RSS news feeds...")
        all_articles = []
        
        for url in RSS_FEEDS:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries:
                    published_at = None
                    if hasattr(entry, 'published'):
                        try:
                            published_at = parsedate_to_datetime(entry.published)
                            # Strip timezone info to make it naive for sqlite compatibility easily
                            if published_at:
                                published_at = published_at.replace(tzinfo=None)
                        except Exception:
                            published_at = datetime.utcnow()
                    else:
                        published_at = datetime.utcnow()
                        
                    # Clean description
                    description = ""
                    if hasattr(entry, 'description'):
                        soup = BeautifulSoup(entry.description, 'html.parser')
                        description = soup.get_text()[:300] + ("..." if len(soup.get_text()) > 300 else "")
                    
                    image_url = NewsService._extract_image_from_entry(entry)
                    source_name = feed.feed.title if hasattr(feed, 'feed') and hasattr(feed.feed, 'title') else "Football News"

                    article = {
                        "title": entry.get("title", ""),
                        "description": description,
                        "image_url": image_url,
                        "article_url": entry.get("link", ""),
                        "source_name": source_name,
                        "published_at": published_at
                    }
                    all_articles.append(article)
            except Exception as e:
                logger.error(f"Error parsing feed {url}: {e}")

        # Now match articles to clubs
        new_articles_count = 0
        for club, keywords in CLUB_KEYWORDS.items():
            club_articles = []
            for article in all_articles:
                text_to_search = (article["title"] + " " + article["description"]).lower()
                # Check if any keyword matches
                if any(kw in text_to_search for kw in keywords):
                    # It's a match for this club
                    club_articles.append(article)
            
            # Store them (batched per club)
            for article in club_articles:
                existing = db.query(ClubNews).filter_by(club_name=club, article_url=article["article_url"]).first()
                if not existing:
                    news_entry = ClubNews(
                        club_name=club,
                        title=article["title"],
                        description=article["description"],
                        image_url=article["image_url"],
                        article_url=article["article_url"],
                        source_name=article["source_name"],
                        published_at=article["published_at"]
                    )
                    db.add(news_entry)
                    new_articles_count += 1

            # Commit once per club instead of per article
            try:
                db.commit()
            except IntegrityError:
                db.rollback()

        # Cleanup old news (keep only latest 50 per club) -- single pass
        for club in CLUB_KEYWORDS.keys():
            news_to_keep = db.query(ClubNews).filter_by(club_name=club).order_by(ClubNews.published_at.desc()).limit(50).all()
            if news_to_keep:
                keep_ids = [n.news_id for n in news_to_keep]
                db.query(ClubNews).filter(ClubNews.club_name == club, ClubNews.news_id.notin_(keep_ids)).delete(synchronize_session=False)
        db.commit()

        logger.info(f"News fetch complete. Inserted {new_articles_count} new articles.")

    @staticmethod
    def get_news_for_club(db: Session, club_name: str, limit=10):
        """Retrieve the latest cached news for a specific club."""
        # Find closest matching predefined club to the provided club_name
        club_name_lower = club_name.lower().strip()
        matched_club = None
        
        for predefined_club, keywords in CLUB_KEYWORDS.items():
            if club_name_lower == predefined_club or any(kw == club_name_lower for kw in keywords):
                matched_club = predefined_club
                break
                
        # Fallback: exact match or partial match on keywords
        if not matched_club:
            for predefined_club, keywords in CLUB_KEYWORDS.items():
                if any(kw in club_name_lower or club_name_lower in kw for kw in keywords):
                    matched_club = predefined_club
                    break

        if not matched_club:
            return [] # No news configured for this club
            
        articles = db.query(ClubNews).filter_by(club_name=matched_club).order_by(ClubNews.published_at.desc()).limit(limit).all()
        return [article.to_dict() for article in articles]
