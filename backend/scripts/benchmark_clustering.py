import asyncio
import time
from app.collectors.base import NormalizedArticle
from app.services.topic_clustering import _cluster_keyword, _cluster_embedding

from datetime import datetime
def benchmark():
    now = datetime.now()
    # Construct a small dataset
    articles = [
        NormalizedArticle(title="OpenAI launches new model", description="", url="1", author="", source="NEWS", source_type="Tech", published_at=now, country="US", language="en", category="", image_url=""),
        NormalizedArticle(title="OpenAI unveils latest AI model", description="Altman speaks", url="2", author="", source="NEWS", source_type="Tech", published_at=now, country="US", language="en", category="", image_url=""),
        NormalizedArticle(title="New OpenAI model released", description="", url="3", author="", source="NEWS", source_type="Tech", published_at=now, country="US", language="en", category="", image_url=""),
        NormalizedArticle(title="Tesla pushes FSD update", description="v12 hits the road", url="4", author="", source="NEWS", source_type="Auto", published_at=now, country="US", language="en", category="", image_url=""),
        NormalizedArticle(title="SpaceX Starship launch scheduled", description="Test flight 3", url="5", author="", source="NEWS", source_type="Space", published_at=now, country="US", language="en", category="", image_url=""),
        NormalizedArticle(title="Elon Musk announces new Tesla autopilot features", description="", url="6", author="", source="NEWS", source_type="Auto", published_at=now, country="US", language="en", category="", image_url=""),
    ]

    print("=== BENCHMARKING CLUSTERING METHODS ===")
    
    # 1. KEYWORD BASELINE
    print("\n--- BASELINE: Keyword Overlap (TF-IDF) ---")
    start = time.time()
    kw_clusters, kw_docs = _cluster_keyword(articles, threshold=0.15)
    kw_time = time.time() - start
    
    print(f"Time Taken: {kw_time:.4f}s")
    for idx, cluster in enumerate(kw_clusters):
        print(f"Cluster {idx+1}:")
        for a_idx in cluster:
            print(f"  - {articles[a_idx].title}")

    # 2. SEMANTIC EMBEDDING
    print("\n--- ADVANCED: Semantic Embedding (all-MiniLM-L6-v2) ---")
    # Pre-warm model cache
    from app.services.topic_clustering import get_embedding_model
    get_embedding_model()
    
    start = time.time()
    em_clusters, em_docs = _cluster_embedding(articles, threshold=0.55)
    em_time = time.time() - start

    print(f"Time Taken (Inference & Clustering): {em_time:.4f}s")
    for idx, cluster in enumerate(em_clusters):
        print(f"Cluster {idx+1}:")
        for a_idx in cluster:
            print(f"  - {articles[a_idx].title}")

if __name__ == "__main__":
    benchmark()
