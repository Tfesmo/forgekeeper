# Forgekeeper

A web-based AI interface for software development.

Forgekeeper is an agent orchestration server with a focus on aggressive context management.  It prunes context when it grows too large, while preserving your agents.md instructions and guiding your agent to keep on task.  Long term session memory is preserved by guiding the agent to take notes in a configured vector database (e.g. Chroma, Qdrant).  It provides a local web-based UI for interaction.

## Requirements

Forgekeeper is currently in very early development - more information to come later.

## Running

Start the development server:

```bash
npm run dev
```

Then open your browser to `http://127.0.0.1:8080`.

Or build and start for production:

```bash
npm run build
npm run start
```

The Express server will be available at `http://127.0.0.1:8080`.

## Configuration

The LLM proxy URL and other server settings are configured in `src/server.js`.  Settings files (`~/.forgekeeper/settings.json`) are no longer used.


