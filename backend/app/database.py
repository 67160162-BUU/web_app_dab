import os
import time
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DB_TYPE = os.getenv("DB_TYPE", "postgres").strip().lower()
in_docker = os.path.exists("/.dockerenv") or os.getenv("IS_DOCKER", "false").lower() == "true"

# Auto-detect DB_TYPE if not explicitly configured
if not DB_TYPE:
    if os.getenv("DB_PORT") == "5432" or os.getenv("DB_USER") == "postgres":
        DB_TYPE = "postgres"
    else:
        DB_TYPE = "mysql"

DB_NAME = os.getenv("DB_NAME", "dance_detector")

if DB_TYPE == "postgres":
    default_host = "db_postgres" if in_docker else "localhost"
    raw_host = os.getenv("DB_HOST", "").strip()
    DB_HOST = raw_host if raw_host and raw_host != "db_mysql" else default_host

    raw_port = os.getenv("DB_PORT", "").strip()
    DB_PORT = raw_port if raw_port and raw_port != "3306" else "5432"

    raw_user = os.getenv("DB_USER", "").strip()
    DB_USER = raw_user if raw_user and raw_user != "root" else "postgres"

    DB_PASSWORD = os.getenv("DB_PASSWORD", "rootpassword")
    DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
        "connect_args": {"connect_timeout": 10}
    }
else:
    default_host = "db_mysql" if in_docker else "localhost"
    raw_host = os.getenv("DB_HOST", "").strip()
    DB_HOST = raw_host if raw_host and raw_host != "db_postgres" else default_host

    raw_port = os.getenv("DB_PORT", "").strip()
    DB_PORT = raw_port if raw_port and raw_port != "5432" else "3306"

    raw_user = os.getenv("DB_USER", "").strip()
    DB_USER = raw_user if raw_user else "root"

    DB_PASSWORD = os.getenv("DB_PASSWORD", "rootpassword")
    password_part = f":{DB_PASSWORD}" if DB_PASSWORD else ""
    DATABASE_URL = f"mysql+pymysql://{DB_USER}{password_part}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_recycle": 3600,
        "pool_size": 10,
        "max_overflow": 20,
        "connect_args": {"connect_timeout": 10}
    }

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

