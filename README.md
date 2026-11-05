# pi-durable on Cloudflare

A working example of [`@earendil-works/pi-durable`](https://www.npmjs.com/package/@earendil-works/pi-durable) running in a Cloudflare Durable Object.

Start with the [Pi Durable announcement](https://earendil.com/posts/pi-durable/) for the ideas behind the harness. This repository shows one way to put those ideas into a small, usable web application.

Pi Durable is experimental, so its APIs may still change.

## What you can try

- Create a shared chat session and open it in multiple browsers.
- Run several conversations at once and fork a conversation from an earlier message.
- Reconnect without losing committed transcripts or queued prompts.
- Schedule one-time or recurring follow-ups.
- Ask a search subagent about earlier conversations.
- Open Activity to inspect live task ownership, waits, sleeps, tool calls, and background work while conversations run, and to retry a task parked after repeated crashes.

This is a sample, not a production service. It intentionally has no authentication or rate limiting.

## Run it locally

You need Node.js 22.19 or newer, Bun 1.3, and an OpenRouter API key.

```sh
bun install
cp .dev.vars.example .dev.vars
```

Add your key to `.dev.vars`:

```dotenv
OPENROUTER_API_KEY=your-key
```

Then start the Worker and React client together:

```sh
bun run dev
```

Open the local URL printed by Vite, create a session, and send a message. Open the session URL in another browser to try the multiplayer flow.

## Where to look

The shortest path through the project is:

- [`src/chat.ts`](src/chat.ts) defines the models, extensions, tools, and default agent.
- [`src/session.ts`](src/session.ts) hosts the harness with Pi Durable's built-in Durable Object SQLite storage and connects it to Cloudflare's native hibernating WebSockets and alarms.
- [`src/tools/`](src/tools) contains the example tools and tasks, one extension per feature.
- [`src/client/`](src/client/) is the React client and its event-driven session state.
- [`test/`](test/) covers application flows including restart recovery, scheduling, forks, and inboxes. Pi Durable tests its built-in Cloudflare storage adapter inside a Durable Object itself.

The code is the documentation for this integration. In particular, the tests are useful examples of restart behavior, scheduling, forks, and inboxes.

## Commands

```sh
bun run dev        # local development
bun run test       # test suite
bun run check      # formatting, types, build, and deploy dry run
bun run build      # production build
bun run preview    # preview the production build locally
```

## Deploy

Authenticate Wrangler, store the API key as a Worker secret, then deploy:

```sh
bunx wrangler login
bunx wrangler secret put OPENROUTER_API_KEY
bun run deploy
```

Before exposing a deployment, add authentication, authorization, and rate limiting. Anyone who can reach this sample can create sessions that use your model credentials.

## Further reading

- [Pi Durable announcement](https://earendil.com/posts/pi-durable/)
- [pi-durable package documentation](https://github.com/earendil-works/pi/tree/main/packages/durable)
- [pi-durable examples](https://github.com/earendil-works/pi/tree/main/packages/durable/test/examples)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
