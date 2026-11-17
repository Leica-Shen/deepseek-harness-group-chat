# Market submission PR — exact text

PR [#15765](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/15765)
is already open with the template body unchanged. There is **no GitHub token on
this machine**, so the repository cannot rewrite the PR programmatically. Paste
the text below in the GitHub Web UI (Edit). Do not close and reopen the PR: the
head branch and the entry file are already correct.

## Title

```text
Add 群聊 Group-Chat (Leica-Shen/deepseek-harness-group-chat)
```

## Body

```markdown
- [x] I added one file at data/plugins/Leica-Shen__deepseek-harness-group-chat.yml
- [x] My repo's package.json declares dsh.bundle (./cordis.patch.yml)
- [x] My repo is at least 1 day old
- [x] category is one of the listed values (session)
- [x] Description states what the plugin does, no superlatives
- [x] My repo has the dsh-plugin topic

- Version 2.4.7; local `npm test` 155/155; repo CI green.
- Install check: `dsh plugin --profile desktop add github:Leica-Shen/deepseek-harness-group-chat`, then restart Harness once.
- Feature summary: existing sessions join a room; `@alias` / `#role` / `*` routing; human operator is in-room; audited notes/decisions; bounded subagent delegation; one-to-one relay with five hard-coded red lines; credential scan; broadcast preview; pause/emergency stop; per-group sensitivity; retention/redaction; bilingual panel.
- Screenshots live in the repo's `screenshots.json` (2.2 evidence, 1200×777); the icon is GitHub-hosted `assets/icon-180.png`. A 2.4 post-restart walk-through is tracked in docs/UI-ACCEPTANCE.md.
- Package name is `@leica-shen/dsh-group-chat`; the plugin id and data directory remain `group-talk-l` for upgrade continuity.
```

## Notes for the reviewer

- The entry's `name` is a bare display name (`群聊 Group-Chat`), which the
  validator accepts. Changing it to `owner/repo` is optional and, if done, must
  equal the URL repository exactly (a parenthesised suffix would fail).
- The icon URL points at `main`; the 2.4.0 tag includes `assets/` so a future
  entry can pin the tag.
- If the template changed upstream, keep the six checks and add the three
  sentences; the gate only requires the entry to be valid.
