# Documentation map

This project follows the four Diátaxis needs rather than mixing all prose in
one file.

| Need | Read |
| --- | --- |
| Learn by doing (tutorial) | [README: 用起来是什么感觉](../README.md#用起来是什么感觉) and [安装](../README.md#安装) |
| Complete a task (how-to) | [README: 使用](../README.md#使用), [安全配置](../README.md#安全与滥用防护) |
| Look up exact values (reference) | [配置表](../README.md#配置), [/group 命令](../README.md#人类命令), [SECURITY: 测试矩阵](../SECURITY.md#8-测试矩阵) |
| Understand why (explanation) | [DESIGN.md](../DESIGN.md), [SECURITY.md](../SECURITY.md), [COMPATIBILITY.md](../COMPATIBILITY.md) |
| Build another plugin (template) | [PLUGIN-ANATOMY.md](PLUGIN-ANATOMY.md), [ADAPTERS.md](../ADAPTERS.md) |

When a behavior changes, update the matching quadrant instead of appending to
an unrelated section.

- [UI-ACCEPTANCE.md](UI-ACCEPTANCE.md) — post-restart 2.4 acceptance matrix (layout, truthfulness, interaction, security, evidence).
- [MARKET-PR.md](MARKET-PR.md) — the exact title/body for the awesome-dsh-plugin PR (the repository cannot update the PR without a token).
- [RELEASE-2.4.0.md](RELEASE-2.4.0.md) / [RELEASE-2.4.1.md](RELEASE-2.4.1.md) / [RELEASE-2.4.2.md](RELEASE-2.4.2.md) — release notes, tag commands and the GitHub Release body.
