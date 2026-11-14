# Documentation map (English)

Chinese is the primary product language; this page and [README.en.md](../README.en.md) are the English entry points.

- [README.en.md](../README.en.md) — install, usage, 2.1 features, roles, delegation and safety.
- [DESIGN.md](../DESIGN.md) — domain model, delivery semantics, human priority, audit/control rows, subagent delegation boundaries.
- [SECURITY.md](../SECURITY.md) — threat model, budgets, injection boundaries, subagent delegation security (§9.5), test matrix.
- [CHANGELOG.md](../CHANGELOG.md) — 2.0.x and 2.1.0 history.
- [PLUGIN-ANATOMY.md](PLUGIN-ANATOMY.md) — how the Host/Client halves fit into a DSH plugin.

## Core ideas

1. A group is **not** a new Session. It is membership + a shared transcript + routing; each participant keeps its own context, model and workspace.
2. A normal assistant answer stays local. A participant must explicitly call `group_talk_send` to reply in the room; the panel shows a waiting state until a reply lands.
3. The human operator is a UI-only principal (`human`). Messages to the human are `in-room` (transcript/panel), not Session deliveries. Human messages are user instructions; agent messages are untrusted peer content.
4. Every send is checked and charged by the same guard: fan-out, cooldown, dedupe, burst and daily message/delivery/token budgets.
5. Secretary and Organizer are duty labels. The Host enforces `group_talk_note` (secretary/organizer) and `group_talk_delegate` (organizer/owner, opt-in, audited).
6. A delegated subagent is not a group member, gets no group tools, cannot delegate further, has a timeout and quota, and leaves audited control rows.
