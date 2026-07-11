# Pet

A hackathon MVP for reducing household food waste with a virtual pet.

This is not a perfect fridge inventory tracker. It is a food-waste prevention assistant that works at the two moments that matter most: before users overbuy, and before food gets forgotten. The app creates lightweight inventory, blocks likely overbuying, plans daily food rescue tasks, and updates a pet based on explainable waste-prevention actions.

## Features

- First-screen waste brief: today risk count, likely items saved, and best next action.
- Shopping Check as the core entry point before buying more food.
- Virtual pet dashboard with mood, health, energy, and trust.
- Inventory with active, frozen, used, shared, and discarded states.
- Today rescue decisions generated from item risk and suggested use dates.
- AI daily plan with recipe steps and synchronized inventory tasks.
- Purchase guard for duplicates and too much high-risk food.
- Demo date controls for testing future planning.
- Optional Google AI Studio / OpenAI-backed image recognition and rescue planning.
- Static QR demo mode with mock recognition and rule-based rescue plan fallback.
- Local-first storage for hackathon demo use.

## Demo Story

Pitch the app as a decision interceptor, not as a perfect tracker:

> The app does not need to know every bite. It catches the few decisions where food waste is most likely to happen: buying a duplicate, ignoring a use-today item, or missing a simple freeze/share/use action.

Suggested demo flow:

1. Start on the Dashboard and show `Today waste risks`, `Potential waste avoided`, and `Best action`.
2. Open Shopping Check and enter `spinach, milk, ice cream`.
3. The pet blocks spinach because it already exists and is urgent.
4. Choose the default `Skip purchase` or `Reduce quantity` action.
5. Show Impact: duplicate buy avoided and estimated waste avoided increase.
6. Return to Dashboard and show the two-step flow: `Check chicken` first if quality/date is uncertain, then `Freeze after check` or `Used some`.
7. Show the pet reaction and Impact story explaining which waste was prevented. Checking builds trust, but only use/freeze/share/reduced purchase counts as rescued waste.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Demo QR Code

Use the `Show QR` button in the top bar to generate a QR code from the current browser URL.

- `localhost` or `127.0.0.1`: only works on the same computer.
- private Wi-Fi addresses such as `192.168.x.x`: can work on devices on the same network.
- deployed HTTPS URLs: suitable for judges and public hackathon demos.

The QR code is generated in the browser. No QR service or server API is required. Each phone keeps its own local demo data, so judges do not affect each other's inventory or pet state.

## Optional AI Setup

The stable QR demo does not require remote AI. By default, image upload uses mock recognition and the rescue plan uses local rule fallbacks.

Remote AI is only for local experimentation unless a backend API is deployed.

```bash
cp .env.example .env.local
```

Set server-side keys in `.env.local`:

```bash
GOOGLE_AI_API_KEY=
GOOGLE_AI_MODEL=gemini-1.5-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Do not expose real API keys as `VITE_*` variables.

## Quality Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Cloudflare Workers Deployment

The production deployment serves the React build and the three `/api/*` AI routes
from one Cloudflare Worker. Static assets are configured in `wrangler.jsonc`, while
`worker/index.ts` handles recognition and daily rescue planning.
`GET /api/health` reports whether the Worker is running in bring-your-own-key
mode and whether an optional operator AI secret is configured, without exposing
any secret.
Static responses receive CSP, referrer, MIME-sniffing, framing, and permissions
headers through `public/_headers`.

Live deployment: https://pet-food-waste.jialepi-apps.workers.dev

For local Worker development, create an ignored `.dev.vars` file:

```bash
GOOGLE_AI_API_KEY=your_key_here
# Or use OPENAI_API_KEY instead.
```

Then run:

```bash
npm run dev:cloudflare
```

Before the first production deploy, authenticate Wrangler:

```bash
npx wrangler login
npm run deploy
```

The public deployment uses a bring-your-own-key flow. Each user selects Google AI
or OpenAI in **AI Settings** and enters their own key. The key is kept in browser
session storage, sent only on AI requests, and forwarded by the Worker without
being stored or returned. Model names remain non-secret Worker variables in
`wrangler.jsonc`.

For a private deployment, an operator may still configure `GOOGLE_AI_API_KEY` or
`OPENAI_API_KEY` as a Wrangler secret. User-provided keys take precedence for that
request. API keys must never be committed.

## Notes

Food dates and plans are guidance only. The app must not be treated as a food safety authority; users should still check storage, packaging, smell, appearance, and local food safety guidance.

## License

Apache License 2.0.
