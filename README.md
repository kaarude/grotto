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
provider = "openai"               # or any of the embed providers below
model = "text-embedding-3-small"
# baseUrl = "https://api.openai.com/v1"  # optional, for OpenAI-compatible
# apiKey = "sk-..."               # optional — prefer $OPENAI_API_KEY

[llm]
provider = "openai"               # or any of the LLM providers below
model = "gpt-4o-mini"
# baseUrl = "https://api.openai.com/v1"
# apiKey = "sk-..."               # optional — prefer $OPENAI_API_KEY

[chat]
topK = 5                          # chunks to retrieve per question
temperature = 0.3
```

**API key resolution order** (for any provider that needs a key):

1. `process.env.GROTTO_API_KEY` (universal override)
2. `process.env.OPENAI_API_KEY` (back-compat)
3. Provider-specific env var (e.g. `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, …)
4. `apiKey` field in TOML

Edit interactively with `grotto config edit` (opens `$EDITOR`).

## Commands

| Command                  | What it does                       |
| ------------------------ | ---------------------------------- |
| `grotto init`            | First-time setup                   |
| `grotto add [path]`      | Index notes (optionally `--watch`) |
| `grotto chat`            | Interactive chat with your notes   |
| `grotto list`            | Show indexed collections           |
| `grotto web`             | Open the local web UI (optional)   |
| `grotto config show`     | Print current config (keys masked) |
| `grotto config path`     | Print config file path             |
| `grotto config edit`     | Open config in `$EDITOR`           |
| `grotto config validate` | Validate current config            |

## Provider matrix

### LLM

| Provider              | Protocol      | Default model                       | Notes                        |
| --------------------- | ------------- | ----------------------------------- | ---------------------------- |
| **OpenAI**            | OpenAI-compat | `gpt-4o-mini`                       | Default · BYOK               |
| **OpenRouter**        | OpenAI-compat | `anthropic/claude-3.5-sonnet`       | 100+ models · one key        |
| **Anthropic**         | native        | `claude-3-5-sonnet-latest`          | Claude via the Messages API  |
| **Groq**              | OpenAI-compat | `llama-3.1-70b-versatile`           | Very fast LPU inference      |
| **Together AI**       | OpenAI-compat | `Meta-Llama-3.1-70B-Instruct-Turbo` | Open models                  |
| **Mistral**           | OpenAI-compat | `mistral-large-latest`              | Mistral's first-party models |
| **xAI (Grok)**        | OpenAI-compat | `grok-2-latest`                     | xAI's Grok                   |
| **DeepSeek**          | OpenAI-compat | `deepseek-chat`                     | Reasoning + chat             |
| **Fireworks AI**      | OpenAI-compat | `llama-v3p1-70b-instruct`           | Fast open models             |
| **Perplexity**        | OpenAI-compat | `sonar-pro`                         | Web-grounded answers         |
| **Cohere**            | OpenAI-compat | `command-r-plus`                    | Cohere's models              |
| **Ollama**            | native        | `llama3.1:8b`                       | Local · free · private       |
| **Ollama Cloud**      | native        | `llama3.1:8b`                       | Hosted Ollama                |
| **LM Studio**         | OpenAI-compat | `local-model`                       | Local · GUI                  |
| **llama.cpp server**  | OpenAI-compat | `local-model`                       | Local · CLI                  |
| **OpenAI-compatible** | OpenAI-compat | `gpt-4o-mini`                       | Any custom base URL          |

### Embeddings

| Provider              | Protocol      | Default model                          | Notes                                |
| --------------------- | ------------- | -------------------------------------- | ------------------------------------ |
| **OpenAI**            | OpenAI-compat | `text-embedding-3-small`               | Default · BYOK                       |
| **OpenRouter**        | OpenAI-compat | `openai/text-embedding-3-small`        | Many embed models via one key        |
| **Voyage AI**         | OpenAI-compat | `voyage-3`                             | Best-in-class for RAG                |
| **Cohere**            | native        | `embed-english-v3.0`                   | Native `/v1/embed` (different shape) |
| **Mistral**           | OpenAI-compat | `mistral-embed`                        | One strong model                     |
| **Jina AI**           | OpenAI-compat | `jina-embeddings-v3`                   | Multilingual                         |
| **Nomic Atlas**       | OpenAI-compat | `nomic-embed-text-v1.5`                | Open weights                         |
| **Together AI**       | OpenAI-compat | `m2-bert-80M-8k-retrieval`             | Open embed models                    |
| **Ollama**            | native        | `nomic-embed-text`                     | Local · free                         |
| **Ollama Cloud**      | native        | `nomic-embed-text`                     | Hosted Ollama                        |
| **LM Studio**         | OpenAI-compat | `text-embedding-nomic-embed-text-v1.5` | Local · GUI                          |
| **llama.cpp server**  | OpenAI-compat | `local-model`                          | Local · CLI                          |
| **OpenAI-compatible** | OpenAI-compat | `text-embedding-3-small`               | Any custom base URL                  |

### Provider-specific env vars

| Provider     | Env var(s)                                 |
| ------------ | ------------------------------------------ |
| Anthropic    | `ANTHROPIC_API_KEY`                        |
| OpenRouter   | `OPENROUTER_API_KEY`                       |
| Groq         | `GROQ_API_KEY`                             |
| Together     | `TOGETHER_API_KEY`                         |
| Mistral      | `MISTRAL_API_KEY`                          |
| xAI          | `XAI_API_KEY` or `GROK_API_KEY`            |
| DeepSeek     | `DEEPSEEK_API_KEY`                         |
| Fireworks    | `FIREWORKS_API_KEY`                        |
| Perplexity   | `PERPLEXITY_API_KEY` or `PPLX_API_KEY`     |
| Cohere       | `COHERE_API_KEY` or `CO_API_KEY`           |
| Ollama Cloud | `OLLAMA_API_KEY` or `OLLAMA_CLOUD_API_KEY` |
| Voyage       | `VOYAGE_API_KEY`                           |
| Jina         | `JINA_API_KEY`                             |
| Nomic        | `NOMIC_API_KEY`                            |

Anywhere that speaks the OpenAI API also works through `provider = "openai-compatible"` with a custom `baseUrl`.

## Cloud vs local

|         | Cloud (default)        | Ollama                     |
| ------- | ---------------------- | -------------------------- |
| Cost    | Pay per token          | Free                       |
| Speed   | Fast, scalable         | Depends on your hardware   |
| Privacy | Your data hits the API | Stays on your machine      |
| Setup   | Just an API key        | Install + download a model |

Grotto makes the switch a one-line config change.

## Architecture

```
src/
├── cli/         # commander entry, commands, Ink TUI (v0.4)
├── core/        # config, ingest, retrieve, chat, store (LanceDB)
├── providers/   # LLM + embed backends (Ollama, Anthropic, OpenAI-compatible)
│   └── presets.ts  # the single source of truth for provider defaults
├── parsers/     # markdown, pdf, text
└── util/        # paths, logger
```

All providers are behind small interfaces. Adding a new OpenAI-compatible provider = one entry in `src/providers/presets.ts`. Adding a new provider with a genuinely different API (like Anthropic) = one file in `src/providers/llm/` + one entry in the presets.

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

Issues and PRs welcome. This is a vibe-coded project: keep it small, keep it sharp, keep it local.
