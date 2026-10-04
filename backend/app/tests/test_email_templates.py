"""Tests for app/services/email_templates.py -- pure string rendering, no DB/network."""

from app.services import email_templates


class TestIncidentEmail:
    def test_created_event_mentions_title_and_severity(self):
        subject, body = email_templates.render_incident_email(
            "incident.created",
            {"title": "API Gateway Outage", "severity": "critical", "status": "investigating"},
            "unsub-token-123",
        )
        assert "API Gateway Outage" in subject
        assert "Critical" in body
        assert "unsub-token-123" in body

    def test_severity_changed_event_shows_both_severities(self):
        subject, body = email_templates.render_incident_email(
            "incident.severity_changed",
            {
                "title": "Database Latency",
                "previous_severity": "minor",
                "severity": "major",
                "status": "identified",
            },
            "unsub-token-456",
        )
        assert "Severity Changed" in subject
        assert "Minor" in body
        assert "Major" in body

    def test_resolved_event_has_resolved_subject(self):
        subject, _ = email_templates.render_incident_email(
            "incident.resolved",
            {"title": "CDN Errors", "severity": "major", "status": "resolved"},
            "unsub-token-789",
        )
        assert "Resolved" in subject

    def test_every_incident_email_includes_an_unsubscribe_link(self):
        for event_type in (
            "incident.created",
            "incident.updated",
            "incident.resolved",
            "incident.severity_changed",
        ):
            _, body = email_templates.render_incident_email(
                event_type,
                {"title": "T", "severity": "minor", "status": "investigating", "previous_severity": "minor"},
                "some-token",
            )
            assert "some-token" in body
            assert "Unsubscribe" in body


class TestServiceEmail:
    def test_service_down_subject(self):
        subject, body = email_templates.render_service_email(
            "service.down", {"service_name": "Payments API"}, "tok"
        )
        assert "Service Down" in subject
        assert "Payments API" in body
        assert "DOWN" in body

    def test_service_recovered_subject(self):
        subject, body = email_templates.render_service_email(
            "service.recovered", {"service_name": "Payments API"}, "tok"
        )
        assert "Recovered" in subject
        assert "recovered" in body
