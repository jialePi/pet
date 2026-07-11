# Pet

A hackathon MVP for reducing household food waste with a virtual pet.

Users can add food manually, from mock receipt/photo flows, or through AI image recognition. The app creates inventory, blocks likely overbuying, plans daily food rescue tasks, and updates a pet based on whether food is used, frozen, shared, or discarded.

## Features

- Virtual pet dashboard with mood, health, energy, and trust.
- Inventory with active, frozen, used, shared, and discarded states.
- Today missions generated from item risk and suggested use dates.
- AI daily plan with recipe steps and synchronized inventory tasks.
- Purchase guard for duplicates and too much high-risk food.
- Demo date controls for testing future planning.
- Static QR demo mode with mock recognition and rule-based AI coach/daily plan fallback.
- Local-first storage for hackathon demo use.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Optional AI Setup

The stable QR demo does not require remote AI. By default, image upload uses mock recognition and the AI coach/daily plan use local rule fallbacks.

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
`worker/index.ts` handles recognition, coaching, and daily planning.
`GET /api/health` reports whether the Worker is running and whether an AI
provider secret is configured, without exposing the secret itself.

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

Before the first production deploy, authenticate Wrangler and add at least one
provider secret:

```bash
npx wrangler login
npx wrangler secret put GOOGLE_AI_API_KEY
# Or: npx wrangler secret put OPENAI_API_KEY
npm run deploy
```

Model names are non-secret Worker variables in `wrangler.jsonc`. API keys must be
stored with Wrangler secrets and must never be committed.

## Notes

Food dates and plans are guidance only. The app must not be treated as a food safety authority; users should still check storage, packaging, smell, appearance, and local food safety guidance.

## License

Apache License 2.0.
