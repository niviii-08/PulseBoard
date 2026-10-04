"""Unit tests for app.services.topic_service and keyword_extraction."""

from app.services.keyword_extraction import extract_keywords, jaccard_similarity, top_terms
from app.services.topic_service import ExistingTopic, match_or_new_topic_name, matches_brand, related_topics


class TestExtractKeywords:
    def test_strips_stopwords(self):
        keywords = extract_keywords("the battery on this is really draining fast")
        assert "the" not in keywords
        assert "this" not in keywords
        assert "battery" in keywords

    def test_empty_text_returns_empty_list(self):
        assert extract_keywords("") == []
        assert extract_keywords(None) == []


class TestJaccardSimilarity:
    def test_identical_sets_score_one(self):
        assert jaccard_similarity(["battery", "drain"], ["battery", "drain"]) == 1.0

    def test_disjoint_sets_score_zero(self):
        assert jaccard_similarity(["battery"], ["refund"]) == 0.0

    def test_empty_lists_score_zero_not_error(self):
        assert jaccard_similarity([], ["battery"]) == 0.0
        assert jaccard_similarity([], []) == 0.0


class TestMatchOrNewTopic:
    def test_similar_posts_cluster_together(self):
        existing = [ExistingTopic(id="t1", keywords=["delivery", "delay", "package", "shipping", "late"])]
        topic_id, keywords = match_or_new_topic_name("my package delivery is late again, so frustrating", existing)
        assert topic_id == "t1"

    def test_unrelated_post_does_not_match(self):
        existing = [ExistingTopic(id="t1", keywords=["battery", "drain", "iphone", "charge"])]
        topic_id, _ = match_or_new_topic_name("great weather for a picnic in the park today", existing)
        assert topic_id is None

    def test_no_existing_topics_returns_none(self):
        topic_id, keywords = match_or_new_topic_name("some new product launch discussion", [])
        assert topic_id is None
        assert len(keywords) > 0


class TestMatchesBrand:
    def test_case_insensitive_substring_match(self):
        assert matches_brand("I just bought new Nike shoes", ["nike"]) is True

    def test_no_match(self):
        assert matches_brand("I just bought new Adidas shoes", ["nike"]) is False

    def test_empty_keywords_never_match(self):
        assert matches_brand("Nike shoes are great", []) is False


class TestRelatedTopics:
    def test_ranks_by_overlap_descending(self):
        candidates = [
            ExistingTopic(id="a", keywords=["battery", "drain", "iphone"]),
            ExistingTopic(id="b", keywords=["refund", "delivery"]),
            ExistingTopic(id="c", keywords=["battery", "iphone", "charge", "drain"]),
        ]
        ranked = related_topics(["battery", "drain", "iphone", "charge"], candidates)
        assert ranked[0][0] == "c"

    def test_zero_overlap_excluded(self):
        candidates = [ExistingTopic(id="a", keywords=["totally", "unrelated"])]
        ranked = related_topics(["battery", "drain"], candidates)
        assert ranked == []


class TestTopTerms:
    def test_finds_most_common_terms_across_texts(self):
        texts = [
            "delivery delay again, so annoying",
            "another delivery delay this week",
            "refund never came through",
        ]
        terms = top_terms(texts, top_n=3)
        term_words = [t[0] for t in terms]
        assert "delivery" in term_words
        assert "delay" in term_words
