<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

---
name: grotto
description: Chat with your notes, locally and privately. A terminal-first RAG tool — the web UI is its browser-based chat surface.
---

# Design System: grotto

## 1. Overview

**Creative North Star: "The Quiet Notebook"**

grotto's web UI is a single page that behaves like a notebook open on a desk. The page has one job: ask a question, get an answer with the sources that produced it. There is no navigation, no sidebar, no chrome. The model and the retrieval are the product; everything else stays out of the way.

The aesthetic sits in the **consumer-dev** lane (Cursor, Raycast, Arc): refined without being precious, opinionated without being loud. Type and whitespace do the heavy lifting. Color is rare and deliberate. Motion exists for state feedback, never as decoration. Anti-references are explicit: this is **not** NotebookLM's three-pane source layout, **not** a retro terminal prompt simulation, **not** an enterprise SaaS dashboard.

**Key Characteristics:**
- One scrollable page. Header is a single line; the rest is the conversation.
- Generous whitespace. The eye should know where to land without effort.
- Streaming text is the most animated thing on the page.
- Both light and dark themes, identical information density, system-preference default.

## 2. Colors

**The Restrained Rule.** Tinted neutrals carry the surface. A single accent color appears on ≤10% of any given screen. Its rarity is the point — when it shows up, it means something (the send button, the active source citation, the streaming cursor).

### Primary (to be resolved at implementation)
- **One accent.** Hue family TBD: a warm-shifted, slightly desaturated primary (think: a quiet rust, a deep moss, or a soft aubergine). Avoids: pure red, neon green, terminal green, ChatGPT blue, Stripe purple.

### Neutral (to be resolved at implementation)
- **Paper** (light theme background, slightly warm): a low-chroma off-white. Never `#fff`.
- **Ink** (text, near-black but tinted): not `#000`.
- **Quiet border** (dividers, source-citation outlines): very low chroma, low contrast.
- **Subtle surface** (hover, active source): one step off the background.

### Dark theme
- The neutrals invert: deep warm-tinted near-black background, warm off-white text. Same accent, recalibrated to maintain contrast in dark.

### Named Rules
- **The Restrained Rule.** One accent, ≤10% of any view. The accent means: action available, state active, or source-cited.
- **The Tinted Neutral Rule.** No `#000`. No `#fff`. Every neutral is chroma ≥ 0.005, hue-matched to the accent.

## 3. Typography

**Single humanist sans throughout.** Inter or IBM Plex Sans for body and UI; JetBrains Mono only for source paths and code blocks. No display font — the page doesn't have a "hero". Headers are the same family at larger sizes, tighter tracking.

**Character:** humanist, neutral, technical-but-warm. The letters feel designed, not algorithmic. Reading 100-word answers should feel like reading a well-edited wiki, not a chatbot.

### Hierarchy (to be resolved at implementation)
- **Body** (400, 16px, line-height 1.6, max 72ch): answers, source snippets, descriptions.
- **Title** (500, 18–20px, line-height 1.3): section labels, source filenames.
- **Label** (500, 12–13px, slight letter-spacing, uppercase OR sentence case per context): button text, nav, metadata.
- **Mono** (400, 13–14px, JetBrains Mono): file paths in citations, code in answers, config snippets.

### Named Rules
- **The One-Font Rule.** No display font, no second sans. The same family at different sizes does all the work.
- **The Cap Rule.** Body text never uses ALL CAPS. Labels can; titles can't.

## 4. Elevation

**Flat by default.** Surfaces sit on the background with tonal layering, not shadows. Borders (1px, very low chroma) are used to delineate interactive areas when needed. A single, very subtle shadow appears only on the prompt-input bar to lift it visually from the conversation.

Motion: state changes (hover, focus, send) transition in <200ms with ease-out curves. No entrance animations, no scroll-driven sequences, no parallax.

## 5. Components

*To be resolved during implementation. The web UI's component set will include:*

- **Prompt bar** (sticky bottom, single line, expandable to multi-line on Shift+Enter).
- **Message block** (one per Q+A pair, generous vertical padding).
- **Source citation** (inline reference chips, expandable to show snippet + path).
- **Theme toggle** (light/dark, top-right, single icon button).
- **Empty state** (centered, explains how to use grotto, lists config summary).

## 6. Do's and Don'ts

### Do
- **Do** show source paths in the answer. The user wants to know *where* the answer came from.
- **Do** stream the answer token by token with a visible cursor.
- **Do** show keyboard shortcuts (Enter to send, Shift+Enter for newline, ⌘K to focus prompt).
- **Do** keep the page header to a single line: grotto wordmark + theme toggle.
- **Do** handle the empty state gracefully — explain what to do if there are no notes indexed yet.
- **Do** respect `prefers-reduced-motion` (skip the streaming cursor animation, instant updates).
- **Do** make the entire interface keyboard-navigable.

### Don't
- **Don't** add a sidebar of suggested prompts. The user knows what they want to ask.
- **Don't** add conversation history sidebar. v0.6 is single-conversation. (v0.7+ may add it.)
- **Don't** add a "New chat" button, a "share" button, a "regenerate" button. Keep the surface minimal.
- **Don't** use `border-left` as a colored accent stripe on citations. Use a chip with full border, or a leading number.
- **Don't** use gradient text. Use a single solid color.
- **Don't** use a modal for the first-run experience. Use the empty state.
- **Don't** fake loading. If something is slow, show real progress.
- **Don't** make the page feel like a SaaS product. It is a local server. The chrome is the URL bar.
- **Don't** add marketing copy, testimonials, "trusted by" badges, or "AI assistant" framing.
- **Don't** use a Material/Tailwind component library look. The interface has its own character.

### Anti-references to actively reject
- **NotebookLM** (three-pane source layout, suggested questions, "conversation starters" chips).
- **Notion AI** (sidebar + main + AI panel, modal-driven interactions).
- **ChatGPT** (left rail of conversations, big centered logo, "What can I help with?" prompt).
- **Linear / Vercel** at their enterprise-SaaS extremes (gradients, metric-heavy dashboards, pricing CTAs) — *not* the parts of Linear that show restraint.
- **iTerm2 / Hyper / any terminal emulator** (green-on-black, prompt simulations, monospace-everywhere).
