# Product

## Register

product

## Users

OSS developers and technically-curious writers who use `grotto` to chat with their local notes via the CLI. The web UI is the *gateway* for them (and their non-CLI-curious collaborators) to use grotto without learning the terminal. They run `grotto web` once, get a local URL, and want the same answer-quality as the CLI but in a browser. Context: at a desk, often switching between an editor and a browser tab, no patience for setup wizards.

## Product Purpose

A browser-based interface for grotto. The CLI is the source of truth for indexing and config; the web UI is a thin, beautiful chat surface that reuses the same LanceDB store and providers. Success: someone runs `grotto web` and has a usable chat-with-notes interface in under 5 seconds, with source citations, streaming responses, and the same model they're already configured for.

## Brand Personality

Three words: **fast, restrained, honest**.

Voice: the CLI talks like a friend who happens to know a lot. The web UI should feel like a clean notebook with a single page open. No bloat, no upsells, no "AI assistant" framing. It is what it says it is.

## Anti-references

- **Not NotebookLM / Notion AI / ChatGPT-clone.** No sidebar-of-suggested-prompts, no "conversation starters", no chip-based prompt templates, no big "New chat" button, no three-pane enterprise layout.
- **Not a retro terminal.** No green-on-black, no CRT scanlines, no `>` prompt simulations, no monospace-everything. The CLI has that aesthetic; the web UI is the *complement*, not a port.
- **Not enterprise SaaS.** No hero metrics, no gradient-text, no "Trusted by 10,000 teams", no modal-first onboarding, no "Sign up to save your chats" (there is no signup; it's a local server).
- **Not a Material/Tailwind UI Kit.** No cookie-cutter cards, no border-left accent stripes, no identical card grids.

## Design Principles

1. **Show the work, not the wrapper.** Citations, source paths, and chunk snippets are first-class UI, not footnotes. The interface's job is to make the retrieval visible.
2. **The page is the product.** No marketing bar, no "upgrade" CTA, no footer. The chat is the page.
3. **Quiet by default.** Streaming is visible (it has to be — that's the point) but the interface doesn't add noise: no typing-indicator dots that aren't tied to actual token arrival, no "thinking" spinners that lie about state.
4. **Matches the local server's character.** `http://localhost:4737` should feel like opening a tool you built, not opening a SaaS product. The chrome (URL bar, browser tab) is the only chrome the page needs.
5. **Honest about state.** Empty states explain what to do. Errors say what went wrong. There is no fake loading.

## Accessibility & Inclusion

- **WCAG 2.1 AA** minimum. Real commitment: keyboard-navigable, focus-visible, contrast-checked in both themes, screen-reader-friendly streaming updates, reduced-motion respect.
- Light and dark themes, follow `prefers-color-scheme` by default with a manual toggle.
- Streaming text must be progressively readable by screen readers (use ARIA live regions correctly, not as an afterthought).
- No essential information conveyed by color alone — source citations have text labels too.
- No animation duration over 200ms except the streaming text itself.

## Technical Notes (for the build)

- The web UI is a **single Node process** served by the existing `grotto web` command. No separate frontend build pipeline unless absolutely necessary — vanilla HTML/JS or a tiny framework served as static files.
- Docker support is a **packaging** concern, not a runtime one. The same Node server runs in the container; the only thing that changes is `GROTTO_DATA_DIR` and the bind mount.
- Reuse every existing module: `loadConfig`, `createLLMProvider`, `createEmbedProvider`, `Store`. The web UI is a thin HTTP layer over what already exists. If a feature needs new core code (e.g. retrieval), that lives in `src/core/`, not in web-only code.
- No `dev`/`build` until v0.6 is ready to verify; ask first.
