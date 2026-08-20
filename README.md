# Skill Hub for Command Code

Keep your [Command Code](https://commandcode.ai) skills up to date and get stack-aware recommendations — all from a single mod.

> The native `/skills` slash command already exists in Command Code (it lists skills), so this mod uses **`/skillhub`** to avoid collision. `/skills-update` remains as a compatibility alias.

## Features

- **Stay up to date** — list and update installed skills.
- **Smart recommendations** — detect your project's stack locally (no network) and suggest relevant skills.
- **Zero install surprises** — recommendations are suggestions only; nothing is installed without confirmation.
- **Model-friendly** — exposes tools so the agent can manage skills on your behalf.

## Slash Commands

| Command | What it does |
|---------|--------------|
| `/skillhub` | Show help |
| `/skillhub list` | List installed skills (`skills list -g --json`) |
| `/skillhub check` | Quick status: installed count + detected stack + pending recommendations |
| `/skillhub update [name]` | Update one or all skills (asks for `confirm`) |
| `/skillhub recommend [--verbose]` | Recommend skills for the current project (local heuristic, no install) |
| `/skills-update [list\|name\|all]` | Compatibility alias for `/skillhub update` / `/skillhub list` |

## Tools (for the model)

| Tool | Description |
|------|-------------|
| `skill_autoupdate_check` | List installed skills; optionally update one (`skillName`) or all (`updateAll`) |
| `recommend_skills` | Recommend skills based on local stack detection (`verbose?`) |

## How the Recommender Works

Purely local, no network. It reads `package.json`, `tsconfig.json`, `astro.config.*`, `pyproject.toml`, `requirements.txt`, and the presence of `tests/`, `prisma/`, `.github/`, `Dockerfile`, etc.

Conservative mapping (examples):

| Detected | Suggested skill |
|----------|----------------|
| `astro` | `astro-framework` |
| `next` / `react` / `vue` / `svelte` / `tailwind` | `vercel-labs/agent-skills` |
| `playwright` / `vitest` / `jest` | `playwright-testing` |
| `pdf` | `pdf` |
| frontend (`ts`/`react`/`vue`/`next`) | `accessibility` |
| `seo` | `seo-audit` |
| `ai` (openai/firecrawl) | `firecrawl` |
| `database` (prisma/drizzle/postgres) | `orchestration` |
| `docs` | `docx` |
| `deploy` (`.github`/`Dockerfile`) | `wrangler` |

Already-installed skills are filtered out. Each suggestion includes:

```
npx skills add <source> --skill <name> -g -y
https://skills.sh/<source>
```

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `autoCheck` | `true` | Show a reminder on session start (`onSessionStart` with `startup`) |
| `autoUpdate` | `false` | Auto-run `skills update -g -y` on session start |
| `autoRecommend` | `false` | Suggest recommended skills on session start when relevant |

```bash
cmdc --mod-option autoRecommend=true
cmdc --mod-option autoUpdate=true
```

The `onSessionStart` hook only runs on `startup` (not `resume`) and never blocks — all work is wrapped in `try/catch`.

## Installation

```bash
# As a Command Code mod
cmdc mods add PabloJustDevelops/skill-hub-mod

# As a skill (for model context)
npx skills add PabloJustDevelops/skill-hub-mod --skill skill-hub -g -y

# Local development
git clone https://github.com/PabloJustDevelops/skill-hub-mod.git
cmdc --mod ./src/index.ts
cmdc mods add ./skill-hub-mod        # project
cmdc mods add -g ./skill-hub-mod     # global
```

After editing, run `/reload` inside a session to reload mods.

## Project Structure

```
skill-hub-mod/
├── package.json          # 0.2.0 {"commandcode":{"mods":["./src/index.ts"]}}
├── src/
│   ├── index.ts          # /skillhub + alias + tools + hooks
│   └── recommend.ts      # detectStack + STACK_TO_SKILLS + format
├── README.md
└── LICENSE               # MIT
```

No build step — `jiti` compiles TypeScript on load.

## Requirements

- [Command Code](https://commandcode.ai) >= 1.28
- [Skills CLI](https://skills.sh) (`npx skills`) >= 1.5 — installed automatically via `npx --yes`

On Windows, Command Code's binary is `cmdc` ( `cmd` is the Windows shell). The examples above use `cmdc`; replace with `cmd` on macOS/Linux.

## How It Works

- `npx skills` has no `check` command — only `list` and `update`. This mod wraps that CLI.
- `npx --yes` skips the install prompt for `skills@latest`.
- `update -g -y` is idempotent: if everything is up to date it does nothing.

## License

MIT
