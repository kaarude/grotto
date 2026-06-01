# grotto

> **Chat with your notes. Locally. Privately. For free.**

A terminal-first RAG (retrieval-augmented generation) tool for your local knowledge base. Point `grotto` at a folder of markdown, PDFs, or text — ask questions in plain English — get cited answers. Runs on your machine by default. Bring your own model, bring your own key, or both.

![demo](docs/demo.gif)

## Why grotto?

- **Local-first.** Runs entirely on your machine. Your notes never leave your laptop unless you opt in.
- **BYOK-friendly.** Use Ollama for free local inference, or bring any OpenAI-compatible API key (OpenAI, OpenRouter, Groq, Together, LM Studio, llama.cpp, …).
- **Bring your own stack.** Embedded vector store (LanceDB), no Docker, no server, no cloud account.
- **Made for tinkerers.** Plain TOML config, no JSON hell, no enterprise bloat.
- **Open source, MIT.** Your data, your model, your tool.

## Install

```bash
npm install -g grotto
```

Requires Node 20+. macOS, Linux, and Windows (via WSL or native) all supported.

## Quick start

```bash
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
provider = "ollama"               # or "openai"
model = "nomic-embed-text"
baseUrl = "http://localhost:11434"
# apiKey = "sk-..."               # only for openai

[llm]
provider = "ollama"               # or "openai"
model = "llama3.1:8b"
baseUrl = "http://localhost:11434"
# apiKey = "sk-..."               # only for openai

[chat]
topK = 5                          # chunks to retrieve per question
temperature = 0.3
```

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
| **Ollama** | ✅ `nomic-embed-text`, any model | ✅ any chat model | Local, free, private |
| **OpenAI** | ✅ `text-embedding-3-*` | ✅ `gpt-4o*`, `gpt-4*`, `o1*` | BYOK |
| **OpenRouter** | ✅ | ✅ 100+ models | BYOK, OpenAI-compatible |
| **Groq** | — | ✅ fast inference | BYOK |
| **Together** | ✅ | ✅ | BYOK |
| **LM Studio** | ✅ | ✅ | Local, OpenAI-compatible |
| **llama.cpp server** | ✅ | ✅ | Local, OpenAI-compatible |

Anywhere that speaks the OpenAI API works. Set the `baseUrl`.

## Architecture

```
src/
├── cli/         # commander entry, commands, Ink TUI
├── core/        # config, ingest, retrieve, chat, store (LanceDB)
├── providers/   # LLM + embed backends (Ollama, OpenAI-compatible)
├── parsers/     # markdown, pdf, text
└── util/        # paths, logger
```

All providers are behind small interfaces. Adding a new backend = one file.

## Roadmap

- [x] v0.1 — Foundation, config, providers, CLI scaffold
- [ ] v0.2 — Ingest: walk, parse, chunk, embed, store
- [ ] v0.3 — Chat: retrieve + stream LLM
- [ ] v0.4 — Ink TUI for chat with source citations
- [ ] v0.5 — Polish, watch mode, cross-platform testing
- [ ] v0.6 — Web UI (Svelte)
- [ ] v0.7 — DOCX, code files, more parsers
- [ ] v0.8 — Anthropic native support
- [ ] v1.0 — Stable API, plugins

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

Issues and PRs welcome. This is a vibe-coded project: keep it small, keep it sharp, keep it local.
