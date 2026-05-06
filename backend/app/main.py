import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.health import router as health_router
from app.module_loader import register_all

app = FastAPI(title="Compass V2")

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(health_router)
app.state.modules = register_all(app)
