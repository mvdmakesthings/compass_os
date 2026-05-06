"""The CORS branch in app.main only runs when CORS_ORIGINS resolves to a non-empty
list. The real app starts with origins set, but this test exercises the empty
path by re-importing app.main with no origins configured.
"""

import importlib
import os


def test_app_skips_cors_when_origins_empty(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "")
    # Force re-evaluation of app.main with the new env.
    import app.main as main_module

    importlib.reload(main_module)
    # CORSMiddleware should not be in the user_middleware stack.
    middleware_classes = [str(m) for m in main_module.app.user_middleware]
    assert not any("CORSMiddleware" in m for m in middleware_classes)

    # Restore for other tests
    monkeypatch.setenv("CORS_ORIGINS", os.getenv("_CORS_RESTORE", "http://test"))
    importlib.reload(main_module)
