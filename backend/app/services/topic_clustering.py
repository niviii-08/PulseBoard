"""
Deterministic Topic Extraction and Clustering (Phase 5).
Uses TF-IDF + Cosine Similarity to form clusters of keywords from articles, 
then asks the LLM to label the cluster once.
"""

from __future__ import annotations

import math
from collections import defaultdict, Counter
from typing import List, Dict, Tuple
from itertools import combinations

from app.collectors.base import NormalizedArticle
from app.services.keyword_extraction import extract_keywords
from app.services.explanation_engine import generate_prose_explanation
from app.core.config import settings
import logging

logger = logging.getLogger("pulseboard.topic_clustering")

def _compute_tf_idf(documents: List[List[str]]) -> List[Dict[str, float]]:
    """Calculates TF-IDF sparse vectors natively."""
    N = len(documents)
    df = Counter()
    
    # Document frequency
    for doc in documents:
        for term in set(doc):
            df[term] += 1
            
    idf = {}
    for term, count in df.items():
        idf[term] = math.log(N / (1 + count)) + 1 # +1 to prevent 0 idf

    tfidf_docs = []
    for doc in documents:
        tf = Counter(doc)
        total_terms = len(doc)
        doc_vector = {}
        if total_terms > 0:
            for term, count in tf.items():
                doc_vector[term] = (count / total_terms) * idf[term]
        tfidf_docs.append(doc_vector)
        
    return tfidf_docs

def _cosine_similarity(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
    intersection = set(vec1.keys()) & set(vec2.keys())
    numerator = sum([vec1[x] * vec2[x] for x in intersection])
    sum1 = sum([val**2 for val in vec1.values()])
    sum2 = sum([val**2 for val in vec2.values()])
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    return float(numerator) / denominator if denominator else 0.0

def generate_cluster_label(cluster_keywords: List[str]) -> str:
    """Uses LLM (if configured) or deterministic heuristic to name the cluster."""
    keywords_str = ", ".join(cluster_keywords[:8])
    if settings.ANTHROPIC_API_KEY:
        prompt = (
            "You are a topic labeling engine. I will provide you with a list of related keywords extracted from news articles. "
            "Your job is to reply with exactly one short, highly descriptive, professional topic name (1 to 5 words maximum) that best describes what these keywords represent. "
            "Do not include quotes, prefixes, or any conversational text.\n"
            f"Keywords: {keywords_str}"
        )
        try:
            label = generate_prose_explanation(prompt)
            if label:
                return label.strip().strip('"').title()
        except Exception as e:
            logger.warning("LLM cluster labeling failed, falling back to heuristics: %s", e)
    
    return f"{cluster_keywords[0]} & {cluster_keywords[1]} Topic".title() if len(cluster_keywords) > 1 else f"{cluster_keywords[0]} Topic".title()

def cluster_articles(articles: List[NormalizedArticle], threshold: float = 0.25) -> Dict[str, List[NormalizedArticle]]:
    """
    1. Extracts keywords for each article.
    2. Builds TF-IDF vectors.
    3. Groups articles with high cosine similarity.
    4. Labels each cluster using top keywords.
    """
    if not articles:
        return {}

    docs_keywords = []
    for a in articles:
        text = f"{a.title} {a.description}" if a.description else a.title or ""
        docs_keywords.append(extract_keywords(text, top_n=12))

    tfidf_vectors = _compute_tf_idf(docs_keywords)
    
    clusters = [] # List of list of indices
    visited = set()

    for i in range(len(articles)):
        if i in visited:
            continue
            
        current_cluster = [i]
        visited.add(i)
        
        for j in range(i + 1, len(articles)):
            if j in visited:
                continue
            sim = _cosine_similarity(tfidf_vectors[i], tfidf_vectors[j])
            if sim >= threshold:
                current_cluster.append(j)
                visited.add(j)
                
        clusters.append(current_cluster)

    # Resolve labels and map to articles
    labeled_clusters = {}
    for cluster_indices in clusters:
        # Get dominant keywords for cluster
        term_freq = Counter()
        for idx in cluster_indices:
            term_freq.update(docs_keywords[idx])
        
        top_cluster_keywords = [t for t, _ in term_freq.most_common(5)]
        if not top_cluster_keywords:
             top_cluster_keywords = ["Unknown"]
        
        label = generate_cluster_label(top_cluster_keywords)
        
        labeled_clusters[label] = [articles[idx] for idx in cluster_indices]
        
    return labeled_clusters
