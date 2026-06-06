from sqlalchemy import create_engine, Column, String, DateTime, Integer, Float, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
import datetime

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./essayai.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    picture = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, default=datetime.datetime.utcnow)
    total_essays = Column(Integer, default=0)


class EssayHistory(Base):
    __tablename__ = "essay_history"
    id = Column(String, primary_key=True)
    user_id = Column(String, index=True)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    topic = Column(String)
    essay_preview = Column(String)
    word_count = Column(Integer)
    overall_score = Column(Float)
    asap_grade = Column(Float)
    dimensions = Column(Text)
    feedback = Column(Text)
    has_improvement = Column(Boolean, default=False)
    improvement_summary = Column(Text, nullable=True)
    score_before = Column(Float, nullable=True)
    score_after = Column(Float, nullable=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
