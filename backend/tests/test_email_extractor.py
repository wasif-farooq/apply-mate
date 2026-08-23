from utils.email_extractor import extract_email, find_email_candidates


def test_finds_address_with_context():
    text = "Great role! Send your CV to careers@acme.io before Friday."
    candidates = find_email_candidates(text)
    assert [c[0] for c in candidates] == ["careers@acme.io"]
    assert "Send your CV to" in candidates[0][1]


def test_deduplicates_case_insensitively():
    text = "mail Careers@Acme.io or careers@acme.io"
    assert len(find_email_candidates(text)) == 1


def test_keeps_onboarding_addresses():
    # The agent-tools copy of this regex dropped any local part starting with
    # "on" or "at", which silently killed these.
    text = "Apply via onboarding@acme.io or attn@acme.io"
    found = {c[0] for c in find_email_candidates(text)}
    assert found == {"onboarding@acme.io", "attn@acme.io"}


def test_drops_noise():
    text = (
        "noreply@acme.io wrote. Logo at sprite@2x.png. "
        "Contact someone@example.com. Real one: hiring@acme.io"
    )
    found = [c[0] for c in find_email_candidates(text)]
    assert found == ["hiring@acme.io"]


def test_preserves_order_for_multiple():
    text = "first@a.com then second@b.com then third@c.com"
    assert [c[0] for c in find_email_candidates(text)] == [
        "first@a.com",
        "second@b.com",
        "third@c.com",
    ]


def test_extract_email_returns_none_when_absent():
    assert extract_email("no addresses here at all") is None
    assert extract_email("") is None
