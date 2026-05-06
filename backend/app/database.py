import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

user = os.getenv("POSTGRES_USER", "compass")
password = os.getenv("POSTGRES_PASSWORD", "compass")
host = os.getenv("DB_HOST", "db")
db_name = os.getenv("POSTGRES_DB", "compass")

DATABASE_URL = f"postgresql+asyncpg://{user}:{password}@{host}/{db_name}"

engine = create_async_engine(DATABASE_URL)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Shared declarative base. Every module's models inherit from this so that a single
    metadata object collects all tables across modules for Alembic autogeneration."""


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with async_session() as session:
        yield session
