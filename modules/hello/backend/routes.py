from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter()


@router.get("/ping")
async def ping(db: AsyncSession = Depends(get_db)) -> dict:
    result = await db.execute(text("SELECT NOW()"))
    db_now = result.scalar_one()
    return {"ok": True, "db_now": db_now.isoformat()}
