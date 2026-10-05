"""
Data cleaning and deduplication logic for PulseBoard ingestion (Phase 4).
"""

from __future__ import annotations
import re
from typing import List
from app.collectors.base import NormalizedArticle

def clean_text(text: str | None) -> str | None:
    if not text:
        return None
    # Remove excessive whitespaces/newlines
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def clean_articles(articles: List[NormalizedArticle]) -> List[NormalizedArticle]:
    """Validates and cleans a batch of articles."""
    cleaned = []
    for a in articles:
        a.title = clean_text(a.title)
        
        if not a.title and not a.description:
            # Skip invalid articles with no meaningful text
            continue
            
        a.description = clean_text(a.description)
        a.author = clean_text(a.author)
        a.source = clean_text(a.source)
        
        cleaned.append(a)
    return cleaned

def deduplicate_articles_in_memory(articles: List[NormalizedArticle]) -> List[NormalizedArticle]:
    """
    In-memory deduplication across a single batch.
    Uses URL as primary key, fallback to title.
    """
    seen_urls = set()
    seen_titles = set()
    deduped = []
    
    for a in articles:
        # If no URL, try to dedupe by exact title
        identifier = a.url
        if identifier:
            if identifier in seen_urls:
                continue
            seen_urls.add(identifier)
        elif a.title:
            if a.title in seen_titles:
                continue
            seen_titles.add(a.title)
                
        deduped.append(a)
        
    return deduped
