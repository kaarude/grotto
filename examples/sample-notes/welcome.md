# Welcome to grotto

This is a sample note used to demo grotto's indexing and chat.

## What grotto does

- Indexes a folder of notes
- Embeds them with your choice of provider (local Ollama or any OpenAI-compatible API)
- Lets you ask questions and get cited answers

## Example queries

After running `grotto add`, try asking:

- "What does grotto do?"
- "How do I configure a different embedding provider?"
- "Where is the config file stored?"

## Why local-first?

Your notes are private. They should stay that way. grotto runs entirely on your machine unless you explicitly bring your own cloud key.

## Getting started

```bash
npm install -g grotto
grotto init
grotto add
grotto chat
```
