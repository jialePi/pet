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
- Optional Google AI Studio / OpenAI-backed image recognition and rescue planning.
- Static QR demo mode with mock recognition and rule-based rescue plan fallback.
- Local-first storage for hackathon demo use.

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

## Notes

Food dates and plans are guidance only. The app must not be treated as a food safety authority; users should still check storage, packaging, smell, appearance, and local food safety guidance.

## License

Apache License 2.0.
