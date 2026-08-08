import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DB_TYPE = os.getenv("DB_TYPE", "").lower()
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "")
DB_NAME = os.getenv("DB_NAME", "dance_detector")

# Auto-detect DB_TYPE if not explicitly configured
if not DB_TYPE:
    if DB_PORT == "5432" or DB_USER == "postgres":
        DB_TYPE = "postgres"
    else:
        DB_TYPE = "mysql"

if DB_TYPE == "postgres":
    port = DB_PORT or "5432"
    user = DB_USER if DB_USER != "root" else "postgres"
    password = DB_PASSWORD or "postgres"
    DATABASE_URL = f"postgresql+psycopg2://{user}:{password}@{DB_HOST}:{port}/{DB_NAME}"
    engine_kwargs = {"pool_pre_ping": True}
else:
    port = DB_PORT or "3306"
    password_part = f":{DB_PASSWORD}" if DB_PASSWORD else ""
    DATABASE_URL = f"mysql+pymysql://{DB_USER}{password_part}@{DB_HOST}:{port}/{DB_NAME}?charset=utf8mb4"
    engine_kwargs = {"pool_pre_ping": True, "pool_recycle": 3600}

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
