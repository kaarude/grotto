# grotto

> **Chat with your notes. Locally. Privately. For free.**

A terminal-first RAG (retrieval-augmented generation) tool for your local knowledge base. Point `grotto` at a folder of markdown, PDFs, or text — ask questions in plain English — get cited answers. Bring your own model, bring your own key, or run it fully local.

![demo](docs/demo.gif)

## Why grotto?

- **Cloud-first, local-ready.** BYOK with any OpenAI-compatible API (OpenAI, OpenRouter, Groq, Together, …) is the default. Ollama is one click away when you want zero-cost, fully-local inference.
- **Your notes, your keys.** Set `OPENAI_API_KEY` in your shell and grotto never writes a key to disk. The TOML config stays clean.
- **Bring your own stack.** Embedded vector store (LanceDB), no Docker, no server, no cloud account.
- **Made for tinkerers.** Plain TOML config, no JSON hell, no enterprise bloat.
- **Open source, MIT.**

## Install

```bash
npm install -g grotto
```

Requires Node 20+. macOS, Linux, and Windows (via WSL or native) all supported.

## Quick start

```bash
# Optional but recommended: keep your key out of config
export OPENAI_API_KEY=sk-...

# 1. Set up your config (one-time, interactive)
grotto init

# 2. Index your notes folder
grotto add

# 3. Chat with them
grotto chat

# 4. (Optional) Spin up the web UI
grotto web
```

## Configuration

Config lives at `~/.config/grotto/config.toml` (respects `$XDG_CONFIG_HOME`).

```toml
version = 1

[notes]
paths = ["/Users/you/Documents/notes"]
ignore = ["**/node_modules/**", "**/.git/**"]

[embed]
provider = "openai"               # or "ollama"
model = "text-embedding-3-small"
# baseUrl = "https://api.openai.com/v1"  # optional, for OpenAI-compatible
# apiKey = "sk-..."               # optional — prefer $OPENAI_API_KEY

[llm]
provider = "openai"               # or "ollama"
model = "gpt-4o-mini"
# baseUrl = "https://api.openai.com/v1"
# apiKey = "sk-..."               # optional — prefer $OPENAI_API_KEY

[chat]
topK = 5                          # chunks to retrieve per question
temperature = 0.3
```

**API key resolution order** (for OpenAI-compatible providers):
1. `process.env.GROTTO_API_KEY`
2. `process.env.OPENAI_API_KEY`
3. `apiKey` field in TOML

Edit interactively with `grotto config edit` (opens `$EDITOR`).

## Commands

| Command | What it does |
|---|---|
| `grotto init` | First-time setup |
| `grotto add [path]` | Index notes (optionally `--watch`) |
| `grotto chat` | Interactive chat with your notes |
| `grotto list` | Show indexed collections |
| `grotto web` | Open the local web UI (optional) |
| `grotto config show` | Print current config (keys masked) |
| `grotto config path` | Print config file path |
| `grotto config edit` | Open config in `$EDITOR` |
| `grotto config validate` | Validate current config |

## Provider matrix

| Provider | Embeddings | LLM | Notes |
|---|---|---|---|
| **OpenAI** | ✅ `text-embedding-3-*` | ✅ `gpt-4o*`, `gpt-4*`, `o1*` | Default · BYOK |
| **OpenRouter** | ✅ | ✅ 100+ models | BYOK · OpenAI-compatible |
| **Groq** | — | ✅ fast inference | BYOK |
| **Together** | ✅ | ✅ | BYOK |
| **LM Studio** | ✅ | ✅ | Local · OpenAI-compatible |
| **llama.cpp server** | ✅ | ✅ | Local · OpenAI-compatible |
| **Ollama** | ✅ `nomic-embed-text` | ✅ any chat model | Local · free · private |

Anywhere that speaks the OpenAI API works. Set the `baseUrl`.

## Cloud vs local

| | Cloud (default) | Ollama |
|---|---|---|
| Cost | Pay per token | Free |
| Speed | Fast, scalable | Depends on your hardware |
| Privacy | Your data hits the API | Stays on your machine |
| Setup | Just an API key | Install + download a model |

Grotto makes the switch a one-line config change.

## Architecture

```
src/
├── cli/         # commander entry, commands, Ink TUI (v0.4)
├── core/        # config, ingest, retrieve, chat, store (LanceDB)
├── providers/   # LLM + embed backends (Ollama, OpenAI-compatible)
├── parsers/     # markdown, pdf, text
└── util/        # paths, logger
```

All providers are behind small interfaces. Adding a new backend = one file.

## Roadmap

- [x] v0.1 — Foundation: config, providers (Ollama + OpenAI-compatible), CLI scaffold
- [ ] v0.2 — `add`: walk, parse, chunk, embed, store in LanceDB
- [ ] v0.3 — `chat`: retrieve + stream LLM (plain output)
- [ ] v0.4 — Ink TUI for chat with source citations
- [ ] v0.5 — Polish: watch mode, error handling, cross-platform testing
- [ ] v0.6 — Web UI (Svelte)
- [ ] v0.7 — More parsers (DOCX, code files)
- [ ] v0.8 — Anthropic native support
- [ ] v1.0 — Stable API, plugin system

## Before publishing to GitHub

A few things to update once you push:

- [ ] `package.json` → `repository.url` (change `USER` to your GitHub handle)
- [ ] `package.json` → `author`, `bugs`, `homepage` fields
- [ ] `README.md` → replace `docs/demo.gif` with your actual demo
- [ ] `README.md` → swap the `USER/grotto` link at the bottom
- [ ] `.github/workflows/ci.yml` → add any extra jobs (e.g., release on tag)

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

Issues and PRs welcome. This is a vibe-coded project: keep it small, keep it sharp, keep it local.
