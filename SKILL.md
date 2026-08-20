---
name: skill-hub
description: Skill Hub for Command Code — keep skills up to date and get stack-aware recommendations. Use when the user wants to list, update, or discover relevant skills for the current project (e.g. "/skillhub", "update my skills", "recommend skills for this project", "what skills should I install here?").
---

# Skill Hub

Manage Command Code skills from a single interface. Works alongside the `skill-hub-mod` (slash commands + tools); this skill provides the detailed usage reference that loads into context when invoked.

## Mod vs Skill

- **Mod** (`skill-hub-mod`): registers `/skillhub`, `/skills-update`, tools `skill_autoupdate_check` / `recommend_skills`, and session hooks. Always available after install.
- **Skill** (this file): loaded on demand (`/skill-hub`) to give the model full context when reasoning about skill management. No duplication — the skill documents what the mod exposes.

Install the mod once:

```bash
# Try without installing
cmdc --mod ./src/index.ts

# Project scope
cmdc mods add /path/to/skill-hub-mod

# Global (every workspace)
cmdc mods add -g /path/to/skill-hub-mod

# From GitHub (once public)
cmdc mods add PabloJustDevelops/skill-hub-mod
npx skills add PabloJustDevelops/skill-hub-mod --skill skill-hub -g -y
```

## Slash Commands

| Command | Description |
|---------|-------------|
| `/skillhub` | Help (lists subcommands) |
| `/skillhub list` | List installed skills (`skills list -g --json`) |
| `/skillhub check` | Quick status: installed count + detected stack + pending recommendations |
| `/skillhub update [name]` | Update one or all skills (prompts with `confirm`) |
| `/skillhub recommend [--verbose]` | Recommend skills for the current project (local heuristic, suggestions only) |
| `/skills-update [list\|name\|all]` | Compatibility alias for `/skillhub update` / `/skillhub list` |

`check` and `recommend` share the same local stack detection (see below). `update` wraps `npx --yes skills update -g -y`.

## Tools

| Tool | Schema | Notes |
|------|--------|-------|
| `skill_autoupdate_check` | `{updateAll?: boolean, skillName?: string}` | No args = list installed; `skillName` = update one; `updateAll` = update all. `readOnly: false` |
| `recommend_skills` | `{verbose?: boolean}` | Recommends for `cwd` via local detection, filtered against installed. `readOnly: true` |

Use `recommend_skills` when the user asks "what should I install here?" — it returns install commands you can surface verbatim.

## Recommendation Heuristic

Purely local, no network. Factors:

- `package.json` deps: `astro`, `next`, `react`, `vue`, `svelte`, `tailwindcss`, `typescript`, `vitest`/`jest`, `playwright`/`cypress`, `pdf` libs, `openai`/`firecrawl`, `prisma`/`drizzle`/`postgres`, `seo` libs, `typedoc`/`docusaurus`
- Files: `tsconfig.json`, `astro.config.*`, `pyproject.toml`, `requirements.txt`, `Dockerfile`, `.github/`, `prisma/`, `tests/`, `__tests__/`

Mapping (conservative):

| Tag | Skill | Source |
|-----|-------|--------|
| `astro` | `astro-framework` | `delineas/astro-framework-agents` |
| `next`/`react`/`vue`/`svelte`/`tailwind` | `vercel-labs/agent-skills` | `vercel-labs/agent-skills` |
| `testing`/`e2e` | `playwright-testing` | `anthropics/skills` |
| `pdf` | `pdf` | `anthropics/skills` |
| frontend stack | `accessibility` | `addyosmani/web-quality-skills` |
| `seo` | `seo-audit` | `anthropics/skills` |
| `database` | `orchestration` | `anthropics/skills` |
| `ai` | `firecrawl` | `anthropics/skills` |
| `docs` | `docx` | `anthropics/skills` |
| `deployment` | `wrangler` | `anthropics/skills` |

Recommendations filter out already-installed skill names and are suggestions only:

```
npx skills add <source> --skill <name> -g -y
https://skills.sh/<source>
```

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `autoCheck` | `true` | Reminder on session start (`startup`) |
| `autoUpdate` | `false` | Auto-run `skills update -g -y` on start |
| `autoRecommend` | `false` | Suggest recommended skills on start when relevant |

```bash
cmdc --mod-option autoRecommend=true
cmdc --mod-option autoUpdate=true
```

`onSessionStart` only fires on `startup` (not `resume`) and is `try/catch`-wrapped.

## Notes

- `npx skills` has no `check` command — only `list` + `update`.
- `npx --yes` skips the `skills@latest` install prompt.
- `cmd` on Windows is the Windows shell; Command Code's binary on this machine is `cmdc`.
