"""Lazy-loaded embedding helper. Wraps fastembed with bge-small-en-v1.5 (384 dims).

The model loads on first call. Keeping this private to the module: if a future module
also needs embeddings, the right move is to extract a shared service then, not now.
"""

from __future__ import annotations

from threading import Lock
from typing import Iterable

_lock = Lock()
_model = None


def _get_model():
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                from fastembed import TextEmbedding

                _model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    return _model


def encode(text: str) -> list[float]:
    return encode_many([text])[0]


def encode_many(texts: Iterable[str]) -> list[list[float]]:
    items = list(texts)
    if not items:
        return []
    model = _get_model()
    return [list(map(float, vec)) for vec in model.embed(items)]


def feature_text(
    *,
    name: str,
    description: str,
    business_value: str,
) -> str:
    parts = [name, description, business_value]
    return "\n".join(p for p in parts if p)
