"""
Deterministic Topic Extraction and Clustering (Phase 5).
Uses TF-IDF + Cosine Similarity to form clusters of keywords from articles, 
then asks the LLM to label the cluster once.
"""

from __future__ import annotations

import math
import logging
from collections import Counter
from typing import List, Dict

try:
    import numpy as np
except ImportError:
    np = None

from app.collectors.base import NormalizedArticle
from app.services.keyword_extraction import extract_keywords
from app.core.config import settings

logger = logging.getLogger("pulseboard.topic_clustering")

_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # Lightweight sentence embedding model good for local dev
            _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        except ImportError:
            logger.error("sentence-transformers not installed. Cannot use embedding clustering.")
            return None
    return _embedding_model

def _compute_tf_idf(documents: List[List[str]]) -> List[Dict[str, float]]:
    """Calculates TF-IDF sparse vectors natively."""
    N = len(documents)
    df = Counter()
    for doc in documents:
        for term in set(doc):
            df[term] += 1
            
    idf = {}
    for term, count in df.items():
        idf[term] = math.log(N / (1 + count)) + 1

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

def _cosine_similarity_sparse(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
    intersection = set(vec1.keys()) & set(vec2.keys())
    numerator = sum([vec1[x] * vec2[x] for x in intersection])
    sum1 = sum([val**2 for val in vec1.values()])
    sum2 = sum([val**2 for val in vec2.values()])
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    return float(numerator) / denominator if denominator else 0.0

def generate_cluster_label(cluster_keywords: List[str]) -> str:
    """Uses deterministic heuristic to name the cluster."""
    return f"{cluster_keywords[0]} & {cluster_keywords[1]} Record".title() if len(cluster_keywords) > 1 else f"{cluster_keywords[0]} Record".title()

def _cluster_keyword(articles: List[NormalizedArticle], threshold: float = 0.25) -> List[List[int]]:
    docs_keywords = []
    for a in articles:
        text = f"{a.title} {a.description}" if a.description else a.title or ""
        docs_keywords.append(extract_keywords(text, top_n=12))

    tfidf_vectors = _compute_tf_idf(docs_keywords)
    clusters = []
    visited = set()

    for i in range(len(articles)):
        if i in visited:
            continue
        current_cluster = [i]
        visited.add(i)
        for j in range(i + 1, len(articles)):
            if j in visited:
                continue
            sim = _cosine_similarity_sparse(tfidf_vectors[i], tfidf_vectors[j])
            if sim >= threshold:
                current_cluster.append(j)
                visited.add(j)
        clusters.append(current_cluster)
    return clusters, docs_keywords

def _cluster_embedding(articles: List[NormalizedArticle], threshold: float = 0.5) -> List[List[int]]:
    model = get_embedding_model()
    if not model or not np:
        logger.warning("Falling back to keyword clustering: model or numpy not available")
        return _cluster_keyword(articles, threshold=0.25)

    texts = [f"{a.title} {a.description}" if a.description else a.title or "" for a in articles]
    embeddings = model.encode(texts)
    
    # Normalize for cosine similarity calculation via dot product
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings = np.where(norms == 0, embeddings, embeddings / norms)
    
    clusters = []
    visited = set()

    for i in range(len(articles)):
        if i in visited:
            continue
        current_cluster = [i]
        visited.add(i)
        for j in range(i + 1, len(articles)):
            if j in visited:
                continue
            sim = np.dot(embeddings[i], embeddings[j])
            if sim >= threshold:
                current_cluster.append(j)
                visited.add(j)
        clusters.append(current_cluster)
        
    # We still need keywords for labeling
    docs_keywords = [extract_keywords(t, top_n=12) for t in texts]
    return clusters, docs_keywords


def cluster_articles(articles: List[NormalizedArticle], threshold: float = 0.25) -> Dict[str, List[NormalizedArticle]]:
    """
    Modular Topic Clustering.
    Routes to chosen method (TF-IDF vs Semantic Embedding) based on config.
    """
    if not articles:
        return {}

    method = getattr(settings, "CLUSTERING_METHOD", "keyword")
    
    logger.info(f"Clustering {len(articles)} articles using method: {method}")
    
    if method == "embedding":
        # Threshold for cosine similarity on embeddings is typically higher than TF-IDF
        clusters, docs_keywords = _cluster_embedding(articles, threshold=0.6)
    else:
        clusters, docs_keywords = _cluster_keyword(articles, threshold=0.25)

    labeled_clusters = {}
    for cluster_indices in clusters:
        term_freq = Counter()
        for idx in cluster_indices:
            term_freq.update(docs_keywords[idx])
        
        top_cluster_keywords = [t for t, _ in term_freq.most_common(5)]
        if not top_cluster_keywords:
             top_cluster_keywords = ["Unknown"]
        
        label = generate_cluster_label(top_cluster_keywords)
        labeled_clusters[label] = [articles[idx] for idx in cluster_indices]
        
    return labeled_clusters
