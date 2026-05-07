"""Unit tests for the Jira client helpers (no network)."""

from modules.agile_digests.backend import jira_client


def test_extract_issue_key_from_browse_url():
    assert (
        jira_client.extract_issue_key(
            "https://acme.atlassian.net/browse/PROJ-123"
        )
        == "PROJ-123"
    )


def test_extract_issue_key_from_modern_jira_url():
    assert (
        jira_client.extract_issue_key(
            "https://acme.atlassian.net/jira/software/projects/PROJ/issues/PROJ-77"
        )
        == "PROJ-77"
    )


def test_extract_issue_key_from_bare_key():
    assert jira_client.extract_issue_key("PROJ-9") == "PROJ-9"


def test_extract_issue_key_returns_none_for_garbage():
    assert jira_client.extract_issue_key("") is None
    assert jira_client.extract_issue_key("not a url") is None
    assert jira_client.extract_issue_key("https://example.com/foo") is None


def test_adf_to_text_renders_paragraphs_and_bullets():
    doc = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "First line."}],
            },
            {
                "type": "bulletList",
                "content": [
                    {
                        "type": "listItem",
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [{"type": "text", "text": "alpha"}],
                            }
                        ],
                    },
                    {
                        "type": "listItem",
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [{"type": "text", "text": "beta"}],
                            }
                        ],
                    },
                ],
            },
        ],
    }
    out = jira_client.adf_to_text(doc)
    assert "First line." in out
    assert "• alpha" in out
    assert "• beta" in out


def test_adf_to_text_empty_inputs():
    assert jira_client.adf_to_text(None) == ""
    assert jira_client.adf_to_text({}) == ""


def test_flatten_capitalizable_handles_shapes():
    assert jira_client._flatten_capitalizable(None) is None
    assert jira_client._flatten_capitalizable(True) == "Yes"
    assert jira_client._flatten_capitalizable(False) == "No"
    assert jira_client._flatten_capitalizable("Yes") == "Yes"
    assert jira_client._flatten_capitalizable({"value": "Cap"}) == "Cap"
    assert jira_client._flatten_capitalizable([{"value": "A"}, {"value": "B"}]) == "A, B"
