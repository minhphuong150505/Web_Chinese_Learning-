# SPEC

The spec has been split into the [`spec/`](./spec/) directory.

Start here: **[spec/README.md](./spec/README.md)**.

Quick map:

- Topic files: `spec/00-overview-and-decisions.md` → `spec/10-pitfalls.md`
- Round-by-round plan (21 rounds): `spec/rounds/`
- Behavioral rules: `Claude.md` (read first, always)
- Original brief: `PROMPT_CLAUDE_CODE.md`

Implementation MUST follow `Claude.md` and the rules in `spec/09-coding-standards.md`. Execute one round at a time, in order, and stop after each round for user approval.
