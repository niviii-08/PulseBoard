import os
import sys

# Add current dir so app imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import Base
from app.models import __all__  # This forces models to load
from sqlalchemy import create_mock_engine
from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import postgresql

with open("schema_utf8.sql", "w", encoding="utf-8") as f:
    def dump(sql, *multiparams, **params):
        f.write(sql.compile(dialect=postgresql.dialect()).string + ";\n")

    engine = create_mock_engine('postgresql://', dump)
    Base.metadata.create_all(engine, checkfirst=False)
