import {
  aiCoachJsonSchema,
  type AiCoachRequest,
  type AiCoachResponse,
} from "../src/lib/ai/coach";
import {
  aiDailyPlanJsonSchema,
  type AiDailyPlanRequest,
  type AiDailyPlanResponse,
} from "../src/lib/ai/dailyPlan";
import {
  normalizeRecognizedCandidates,
  recognitionJsonSchema,
  type RecognizeImageRequest,
  type RecognizeImageResponse,
} from "../src/lib/recognition/aiRecognition";

type AssetFetcher = {
  fetch(request: Request): Promise<Response>;
};

export type Env = {
  ASSETS: AssetFetcher;
  GOOGLE_AI_API_KEY?: string;
  GOOGLE_AI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

type StructuredSchema = Record<string, unknown>;

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const maxRequestBytes = 8 * 1024 * 1024;
const supportedApiRoutes = new Set([
  "/api/recognize",
  "/api/coach",
  "/api/daily-plan",
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === "/api/health") {
      return jsonResponse({
        ok: true,
        mode: "bring-your-own-key",
        operatorAiConfigured: Boolean(
          env.GOOGLE_AI_API_KEY || env.OPENAI_API_KEY,
        ),
      });
    }

    if (!supportedApiRoutes.has(url.pathname)) {
      return jsonResponse({ error: "API route not found" }, 404);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, {
        allow: "POST",
      });
    }

    try {
      const requestEnv = withUserCredentials(request, env);
      if (!requestEnv.GOOGLE_AI_API_KEY && !requestEnv.OPENAI_API_KEY) {
        return jsonResponse(
          {
            error: "Add your API key in AI Settings before using remote AI.",
            missingApiKey: true,
          },
          401,
        );
      }

      assertRequestSize(request);
      const body = await readJsonBody(request);

      if (url.pathname === "/api/recognize") {
        return jsonResponse(
          await recognizeImage(body as RecognizeImageRequest, requestEnv),
        );
      }
      if (url.pathname === "/api/coach") {
        return jsonResponse(
          await createCoachResponse(body as AiCoachRequest, requestEnv),
        );
      }
      if (url.pathname === "/api/daily-plan") {
        return jsonResponse(
          await createDailyPlanResponse(body as AiDailyPlanRequest, requestEnv),
        );
      }

      return jsonResponse({ error: "API route not found" }, 404);
    } catch (error) {
      return jsonResponse(
        {
          error: getRouteError(url.pathname),
          detail: error instanceof Error ? error.message : "Unknown error",
        },
        400,
      );
    }
  },
};

function withUserCredentials(request: Request, env: Env): Env {
  const provider = request.headers.get("x-pet-ai-provider");
  const apiKey = request.headers.get("x-pet-ai-key")?.trim();

  if (!provider && !apiKey) return env;
  if (provider !== "google" && provider !== "openai") {
    throw new Error("Unsupported AI provider.");
  }
  if (!apiKey || apiKey.length < 8 || apiKey.length > 512) {
    throw new Error("Invalid user API key.");
  }

  return {
    ...env,
    GOOGLE_AI_API_KEY: provider === "google" ? apiKey : undefined,
    OPENAI_API_KEY: provider === "openai" ? apiKey : undefined,
  };
}

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, ...extraHeaders },
  });
}

function assertRequestSize(request: Request): void {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxRequestBytes) {
    throw new Error("Request body is too large. Maximum size is 8 MB.");
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxRequestBytes) {
    throw new Error("Request body is too large. Maximum size is 8 MB.");
  }
  return JSON.parse(text) as unknown;
}

function getRouteError(pathname: string): string {
  if (pathname === "/api/recognize") return "Image recognition failed.";
  if (pathname === "/api/coach") return "AI coach failed.";
  if (pathname === "/api/daily-plan") return "AI daily plan failed.";
  return "API request failed.";
}

async function recognizeImage(
  body: RecognizeImageRequest,
  env: Env,
): Promise<RecognizeImageResponse> {
  validateRecognitionRequest(body);
  const prompt = buildRecognitionPrompt(body.mode, body.today);
  const result = await callStructuredProvider({
    env,
    prompt,
    schema: recognitionJsonSchema,
    schemaName: "food_recognition_candidates",
    imageDataUrl: body.imageDataUrl,
  });
  const parsed = result.value as { candidates?: unknown[] };
  if (!Array.isArray(parsed.candidates)) {
    throw new Error("Recognition response did not contain candidates.");
  }
  return {
    candidates: normalizeRecognizedCandidates(
      parsed.candidates as RecognizeImageResponse["candidates"],
      body.mode,
    ),
    provider: result.provider,
    model: result.model,
  };
}

async function createCoachResponse(
  body: AiCoachRequest,
  env: Env,
): Promise<AiCoachResponse> {
  validateCoachRequest(body);
  const result = await callStructuredProvider({
    env,
    prompt: buildCoachPrompt(body),
    schema: aiCoachJsonSchema,
    schemaName: "food_waste_pet_coach",
  });
  return {
    ...(result.value as Omit<AiCoachResponse, "provider" | "model">),
    provider: result.provider,
    model: result.model,
  };
}

async function createDailyPlanResponse(
  body: AiDailyPlanRequest,
  env: Env,
): Promise<AiDailyPlanResponse> {
  validateDailyPlanRequest(body);
  const result = await callStructuredProvider({
    env,
    prompt: buildDailyPlanPrompt(body),
    schema: aiDailyPlanJsonSchema,
    schemaName: "food_waste_daily_plan",
  });
  return {
    ...(result.value as Omit<AiDailyPlanResponse, "provider" | "model">),
    provider: result.provider,
    model: result.model,
  };
}

function validateRecognitionRequest(body: RecognizeImageRequest): void {
  if (!body || (body.mode !== "receipt" && body.mode !== "photo")) {
    throw new Error("Invalid recognition mode.");
  }
  if (typeof body.today !== "string") {
    throw new Error("A valid date is required.");
  }
  if (
    typeof body.imageDataUrl !== "string" ||
    !body.imageDataUrl.startsWith("data:image/")
  ) {
    throw new Error("Expected an image data URL.");
  }
}

function validateCoachRequest(body: AiCoachRequest): void {
  if (!body || !Array.isArray(body.activeItems) || !Array.isArray(body.missions)) {
    throw new Error("Invalid AI coach request.");
  }
}

function validateDailyPlanRequest(body: AiDailyPlanRequest): void {
  if (!body || !Array.isArray(body.activeItems) || !Array.isArray(body.missions)) {
    throw new Error("Invalid AI daily plan request.");
  }
}

async function callStructuredProvider(input: {
  env: Env;
  prompt: string;
  schema: StructuredSchema;
  schemaName: string;
  imageDataUrl?: string;
}): Promise<{
  value: unknown;
  provider: "google" | "openai";
  model: string;
}> {
  if (input.env.GOOGLE_AI_API_KEY) {
    const model = input.env.GOOGLE_AI_MODEL ?? "gemini-1.5-flash";
    return {
      value: await callGoogle({ ...input, model }),
      provider: "google",
      model,
    };
  }

  if (!input.env.OPENAI_API_KEY) {
    throw new Error("No AI provider is configured.");
  }
  const model = input.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  return {
    value: await callOpenAi({ ...input, model }),
    provider: "openai",
    model,
  };
}

async function callOpenAi(input: {
  env: Env;
  prompt: string;
  schema: StructuredSchema;
  schemaName: string;
  model: string;
  imageDataUrl?: string;
}): Promise<unknown> {
  const content: Array<Record<string, unknown>> = [
    { type: "input_text", text: input.prompt },
  ];
  if (input.imageDataUrl) {
    content.push({ type: "input_image", image_url: input.imageDataUrl });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: input.schemaName,
          strict: true,
          schema: input.schema,
        },
      },
    }),
  });
  const payload = (await response.json()) as OpenAiTextResponse & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "OpenAI request failed.");
  }
  return JSON.parse(extractOpenAiText(payload)) as unknown;
}

async function callGoogle(input: {
  env: Env;
  prompt: string;
  schema: StructuredSchema;
  model: string;
  imageDataUrl?: string;
}): Promise<unknown> {
  const parts: Array<Record<string, unknown>> = [{ text: input.prompt }];
  if (input.imageDataUrl) {
    const image = parseDataUrl(input.imageDataUrl);
    parts.push({
      inline_data: { mime_type: image.mimeType, data: image.base64 },
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.env.GOOGLE_AI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: toGoogleResponseSchema(input.schema),
        },
      }),
    },
  );
  const payload = (await response.json()) as GoogleTextResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Google AI request failed.");
  }
  return JSON.parse(extractGoogleText(payload)) as unknown;
}

type OpenAiTextResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
};

function extractOpenAiText(payload: OpenAiTextResponse): string {
  if (payload.output_text) return payload.output_text;
  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((value): value is string => Boolean(value));
  if (!text) throw new Error("OpenAI response did not contain structured text.");
  return text;
}

type GoogleTextResponse = {
  error?: { message?: string };
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

function extractGoogleText(payload: GoogleTextResponse): string {
  const text = payload.candidates?.[0]?.content?.parts?.find(
    (part) => typeof part.text === "string",
  )?.text;
  if (!text) throw new Error("Google AI response did not contain structured text.");
  return text;
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image data URL.");
  return { mimeType: match[1], base64: match[2] };
}

function toGoogleResponseSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGoogleResponseSchema);
  if (!schema || typeof schema !== "object") return schema;

  const unsupported = new Set([
    "additionalProperties",
    "description",
    "minimum",
    "maximum",
    "minItems",
    "maxItems",
    "pattern",
  ]);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (unsupported.has(key)) continue;
    if (key === "type" && Array.isArray(value)) {
      result.type = value.find((candidate) => candidate !== "null") ?? "string";
      continue;
    }
    result[key] = toGoogleResponseSchema(value);
  }
  return result;
}

function buildRecognitionPrompt(
  mode: RecognizeImageRequest["mode"],
  today: string,
): string {
  return [
    `Today is ${today}.`,
    mode === "receipt"
      ? "Extract only food or beverage items from this receipt image."
      : "Identify visible food or beverage items in this photo.",
    "Return candidate inventory items for a food-waste planning app.",
    "Extract quantity and unit carefully. If text says 3L, return proposedQuantity 3 and proposedUnit l, not 3 items.",
    "If text says 500g, return proposedQuantity 500 and proposedUnit g.",
    "If text says 2 at $7.50 each, return proposedQuantity 2 and proposedUnit item, and put package size such as 500g each in notes.",
    "If a product name includes both a count and a size, prefer purchased count as item quantity and preserve package size in notes.",
    "Use suggested dates as planning hints only, not food safety guarantees.",
    "If a field is uncertain, keep a lower confidence score instead of inventing certainty.",
    "Ignore non-food items, taxes, payment lines, store membership lines, and totals.",
  ].join(" ");
}

function buildCoachPrompt(input: AiCoachRequest): string {
  return [
    `Today is ${input.today}.`,
    "You are the friendly virtual pet in a household food-waste planning app.",
    "Create a short flexible coaching response from the current inventory and rule-generated missions.",
    "Do not override the existing mission priority. Add practical wording and small meal/action ideas.",
    "Do not shame the user. Do not claim any food is definitely safe.",
    "If food may be past a suggested date, say to check quality using smell, appearance, packaging, storage, and local guidance.",
    "Keep suggestions realistic for a quick household task.",
    `Pet state: ${JSON.stringify(input.pet)}.`,
    `Active inventory: ${JSON.stringify(input.activeItems.slice(0, 20))}.`,
    `Rule-generated missions: ${JSON.stringify(input.missions.slice(0, 5))}.`,
  ].join(" ");
}

function buildDailyPlanPrompt(input: AiDailyPlanRequest): string {
  return [
    `Today is ${input.today}.`,
    "You are the planning agent for a food-waste virtual pet app.",
    "Create today's concrete recipe plan and usage tasks from the active inventory.",
    "Use the rule-generated missions as priority signals, but you may combine items into practical recipes.",
    "Every usage task must reference an exact itemId from active inventory.",
    "Do not invent ingredients that are not in inventory except optional pantry basics such as salt, oil, water, pepper, rice, pasta, or eggs.",
    "Keep quantities realistic and never request more than the listed quantity.",
    "If an item is measured in l, ml, g, or kg, use the same unit in the task.",
    "Do not claim uncertain food is safe; include checking smell, appearance, packaging, and storage when relevant.",
    "Return recipes and tasks that the app can submit today.",
    `Pet state: ${JSON.stringify(input.pet)}.`,
    `Active inventory: ${JSON.stringify(input.activeItems.slice(0, 25))}.`,
    `Priority missions: ${JSON.stringify(input.missions.slice(0, 8))}.`,
  ].join(" ");
}
