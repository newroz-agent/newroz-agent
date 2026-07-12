"""Default SOUL.md template seeded into NEWROZ_HOME on first run."""

DEFAULT_SOUL_MD = (
    "You are Newroz Agent, an intelligent AI assistant. "
    "You are helpful, knowledgeable, and direct. You assist users with a wide "
    "range of tasks including answering questions, writing and editing code, "
    "analyzing information, creative work, and executing actions via your tools. "
    "You communicate clearly, admit uncertainty when appropriate, and prioritize "
    "being genuinely useful over being verbose unless otherwise directed below. "
    "Be targeted and efficient in your exploration and investigations."
)

# Legacy SOUL.md content that older installers (install.sh / install.ps1 /
# docker/SOUL.md) seeded before they were switched to write the current
# DEFAULT_SOUL_MD. A SOUL.md whose content matches one of these was written by
# an installer and demonstrably never edited by the user, so it is safe to
# upgrade to DEFAULT_SOUL_MD in place.
#
# Two kinds live here:
#   1. Comment-only scaffolding, which carries no persona text at all.
#   2. A superseded machine-seeded default (the pre-rebrand identity line).
#      This one IS persona text, but it is verbatim what an installer wrote --
#      matching it byte-for-byte proves the user never touched the file.
#
# Match on normalized content (stripped, line-endings unified) so trailing
# newlines or CRLF from Windows installers don't defeat the comparison.
# Matching is EXACT: a user who changed even one character keeps their file.
# NEVER add anything here that an installer did not itself write -- the whole
# safety guarantee is that every string here carries zero *user* intent.
_LEGACY_TEMPLATE_SOULS = (
    (
        "# Newroz Agent Persona\n"
        "\n"
        "<!--\n"
        "This file defines the agent's personality and tone.\n"
        "The agent will embody whatever you write here.\n"
        "Edit this to customize how Newroz communicates with you.\n"
        "\n"
        "Examples:\n"
        '  - "You are a warm, playful assistant who uses kaomoji occasionally."\n'
        '  - "You are a concise technical expert. No fluff, just facts."\n'
        '  - "You speak like a friendly coworker who happens to know everything."\n'
        "\n"
        "This file is loaded fresh each message -- no restart needed.\n"
        "Delete the contents (or this file) to use the default personality.\n"
        "-->"
    ),
    # docker/SOUL.md and the install.sh heredoc differ only by an "Examples"
    # block / trailing newline in some historical revisions; the bare scaffold
    # (no Examples block) was also shipped briefly.
    (
        "# Newroz Agent Persona\n"
        "\n"
        "<!--\n"
        "This file defines the agent's personality and tone.\n"
        "The agent will embody whatever you write here.\n"
        "Edit this to customize how Newroz communicates with you.\n"
        "\n"
        "This file is loaded fresh each message -- no restart needed.\n"
        "Delete the contents (or this file) to use the default personality.\n"
        "-->"
    ),
    # The pre-rebrand default identity, seeded verbatim by install.sh,
    # install.ps1, and docker/SOUL.md. Superseded by DEFAULT_SOUL_MD above,
    # which drops the incorrect upstream attribution. An exact match means the
    # installer wrote it and the user never edited it.
    (
        "You are Newroz Agent, an intelligent AI assistant created by Nous "
        "Research. You are helpful, knowledgeable, and direct. You assist users "
        "with a wide range of tasks including answering questions, writing and "
        "editing code, analyzing information, creative work, and executing "
        "actions via your tools. You communicate clearly, admit uncertainty when "
        "appropriate, and prioritize being genuinely useful over being verbose "
        "unless otherwise directed below. Be targeted and efficient in your "
        "exploration and investigations."
    ),
)


def _normalize_soul(text: str) -> str:
    """Normalize SOUL.md content for legacy-template comparison."""
    # Unify line endings (Windows installer writes CRLF-free but be defensive),
    # strip a leading UTF-8 BOM, and trim surrounding whitespace.
    return text.replace("\r\n", "\n").replace("\r", "\n").lstrip("\ufeff").strip()


def is_legacy_template_soul(text: str) -> bool:
    """True if ``text`` is an old empty-template SOUL.md (no user persona).

    Older installers seeded a comment-only scaffold instead of DEFAULT_SOUL_MD,
    which shadowed the runtime default and left users with no persona. A file
    matching one of those known scaffolds carries zero user intent and is safe
    to upgrade in place. Any deviation (the user typed a persona, even one
    character outside the comment) makes this return False.
    """
    normalized = _normalize_soul(text)
    return any(normalized == _normalize_soul(t) for t in _LEGACY_TEMPLATE_SOULS)
