from dataclasses import asdict

from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
async def health(request: Request) -> dict:
    modules = getattr(request.app.state, "modules", [])
    return {"ok": True, "modules": [asdict(m) for m in modules]}
