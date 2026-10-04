"""
Modular data-collection layer.

Every source implements the same BaseCollector interface (collect) and
returns a list of NormalizedPost -- the ingestion pipeline
(app/tasks/ingestion_tasks.py) doesn't know or care which platform a
post came from beyond the `platform` field on the result. This is what
lets sources be added/removed independently, per the spec's "Each
collector must implement a common interface" requirement.
"""
