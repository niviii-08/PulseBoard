"""
Subject/body rendering for outbound notification emails.

Kept as plain string templates (no Jinja dependency) -- the content is
small and fixed enough that a template engine would add a dependency
without buying much. Every render function takes the same JSON-safe
`payload` dict shape the Celery task received (see
app/services/notification_service.py for what each event's payload
contains) plus the specific recipient's own unsubscribe_token, since the
unsubscribe link must be per-recipient even though the rest of the email
is identical for every recipient of a given event.
"""

from app.core.config import settings

_SEVERITY_LABELS = {"minor": "Minor", "major": "Major", "critical": "Critical"}
_STATUS_LABELS = {
    "investigating": "Investigating",
    "identified": "Identified",
    "monitoring": "Monitoring",
    "resolved": "Resolved",
}


def _unsubscribe_line(unsubscribe_token: str) -> str:
    url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/unsubscribe/{unsubscribe_token}"
    return f"\n---\nYou're receiving this because you subscribed to PulseBoard status updates.\nUnsubscribe: {url}\n"


def render_incident_email(
    event_type: str, payload: dict, unsubscribe_token: str
) -> tuple[str, str]:
    """event_type is one of: incident.created, incident.updated, incident.resolved, incident.severity_changed."""
    title = payload.get("title", "Incident")
    severity = _SEVERITY_LABELS.get(payload.get("severity"), payload.get("severity"))
    status_label = _STATUS_LABELS.get(payload.get("status"), payload.get("status"))

    if event_type == "incident.created":
        subject = f"[New Incident] {title}"
        lines = ["A new incident has been opened:", "", title, f"Severity: {severity}", f"Status: {status_label}"]
    elif event_type == "incident.severity_changed":
        previous = _SEVERITY_LABELS.get(payload.get("previous_severity"), payload.get("previous_severity"))
        subject = f"[Severity Changed] {title}"
        lines = [
            "The severity of an incident has changed:",
            "",
            title,
            f"Severity: {previous} -> {severity}",
            f"Status: {status_label}",
        ]
    elif event_type == "incident.resolved":
        subject = f"[Resolved] {title}"
        lines = ["This incident has been resolved:", "", title]
    else:  # incident.updated
        subject = f"[Update] {title}"
        lines = ["An incident has been updated:", "", title, f"Severity: {severity}", f"Status: {status_label}"]

    body = "\n".join(lines) + "\n" + _unsubscribe_line(unsubscribe_token)
    return subject, body


def render_service_email(
    event_type: str, payload: dict, unsubscribe_token: str
) -> tuple[str, str]:
    """event_type is one of: service.down, service.recovered."""
    name = payload.get("service_name", "Service")

    if event_type == "service.down":
        subject = f"[Service Down] {name}"
        body = f"{name} is currently DOWN.\n"
    else:
        subject = f"[Service Recovered] {name}"
        body = f"{name} has recovered and is back to normal.\n"

    body += _unsubscribe_line(unsubscribe_token)
    return subject, body
