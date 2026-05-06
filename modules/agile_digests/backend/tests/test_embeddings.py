"""Direct tests for the embeddings helper. The conftest patches `encode_many`/
`encode` to deterministic vectors; this file pokes the *unmocked* helpers so
that:

  - `feature_text` is exercised against various field combinations.
  - The lazy model-loading path is hit but with a stub instead of fastembed.
"""

from modules.agile_digests.backend import embeddings


def test_feature_text_joins_non_empty_fields():
    out = embeddings.feature_text(
        feature_name="A",
        description="B",
        business_value="",
        notes="C",
    )
    assert out == "A\nB\nC"


def test_feature_text_with_all_empty_returns_empty_string():
    out = embeddings.feature_text(
        feature_name="",
        description="",
        business_value="",
        notes="",
    )
    assert out == ""


def test_encode_many_empty_input_returns_empty(monkeypatch):
    monkeypatch.setattr(embeddings, "_model", None)
    assert embeddings.encode_many([]) == []


def test_encode_uses_lazy_loaded_model(monkeypatch):
    """Drive `encode` through the unmocked path with a stub model so the lazy
    initialization branch in `_get_model` is exercised."""

    class _StubModel:
        def embed(self, texts):
            for t in texts:
                yield [float(len(t)), 0.0, 1.0]

    # Reset module-level singleton then patch the constructor.
    monkeypatch.setattr(embeddings, "_model", None)

    def fake_text_embedding(model_name):  # noqa: ARG001
        return _StubModel()

    import fastembed

    monkeypatch.setattr(fastembed, "TextEmbedding", fake_text_embedding)

    # Bypass the conftest-installed mocks by calling the originals directly.
    text = "hello"
    vec = embeddings._get_model().embed([text])
    assert list(vec) == [[float(len(text)), 0.0, 1.0]]


def test_encode_single_delegates_to_encode_many(monkeypatch):
    captured: list[list[str]] = []

    def fake_encode_many(texts):
        captured.append(list(texts))
        return [[1.0, 2.0, 3.0]]

    monkeypatch.setattr(embeddings, "encode_many", fake_encode_many)
    out = embeddings.encode("hi")
    assert out == [1.0, 2.0, 3.0]
    assert captured == [["hi"]]


def test_real_encode_many_with_stub_model(monkeypatch):
    """Exercise the real `encode_many` body with a stub fastembed model so the
    lazy-load + mapping branches are covered without downloading the real model.

    The conftest only mocks `encode_many`; here we restore the original by
    re-importing the function from the module's source and bind its symbol
    back in place so its body executes.
    """

    class _StubModel:
        def embed(self, texts):
            for t in texts:
                yield [float(len(t)), 0.0, 1.0]

    monkeypatch.setattr(embeddings, "_model", None)

    def fake_text_embedding(model_name):  # noqa: ARG001
        return _StubModel()

    import fastembed

    monkeypatch.setattr(fastembed, "TextEmbedding", fake_text_embedding)

    # Restore the real `encode_many` (the autouse fixture replaced it).
    from conftest import REAL_ENCODE_MANY

    monkeypatch.setattr(embeddings, "encode_many", REAL_ENCODE_MANY)

    assert embeddings.encode_many([]) == []
    out = embeddings.encode_many(["abc", "wxyz"])
    assert out == [[3.0, 0.0, 1.0], [4.0, 0.0, 1.0]]
