// server/index.js
// Local game server: generates AI-written Jeopardy! categories via the Anthropic API
// and (after `npm run build`) serves the built game so one command runs everything.
//
// The API key lives in server/.env (see server/.env.example). It never reaches the browser.

import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, '.env'), quiet: true });

const PORT = Number(process.env.PORT) || 3001;
const MODEL = process.env.JEOPARDY_AI_MODEL || 'claude-opus-5';
const EFFORT = process.env.JEOPARDY_AI_EFFORT || 'medium'; // low | medium | high
const BOARD_VALUES = [200, 400, 600, 800, 1000];
const MAX_CATEGORY_LENGTH = 60;

// ---------------------------------------------------------------------------
// Anthropic client (created lazily so the server starts even without a key)
// ---------------------------------------------------------------------------

let client = null;

function credentialsDetected() {
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return true;
  // `ant auth login` stores a profile the SDK picks up automatically
  return fs.existsSync(path.join(os.homedir(), '.config', 'anthropic'));
}

function getClient() {
  if (!client) {
    client = new Anthropic({ timeout: 90_000, maxRetries: 2 });
  }
  return client;
}

// ---------------------------------------------------------------------------
// Category generation
// ---------------------------------------------------------------------------

const ClueSchema = z.object({
  value: z.number(),
  clue: z.string(),
  response: z.string(),
});

const CategorySchema = z.object({
  clues: z.array(ClueSchema),
});

const SYSTEM_PROMPT = `You are a head writer for the TV quiz show Jeopardy!, writing a category of five clues for a home game night.

Rules:
- A clue is a STATEMENT the host reads aloud. The response is what the contestant says. Never phrase a clue as a question.
- Give each response as the bare answer (e.g. "Michael Schumacher", "gold", "the mitochondria") with no "What is" or "Who is".
- Write exactly five clues in this order and difficulty:
  200 — common knowledge, almost anyone gets it
  400 — easy, most people who know the topic get it
  600 — medium, needs some familiarity
  800 — hard, for real fans
  1000 — expert, only enthusiasts know it
- Clues are 1–2 sentences, specific, and factually accurate. Prefer well-established facts over very recent events. Be witty when it fits, in the style of the show.
- Each clue has ONE clear, unambiguous response of 1–4 words. No math, trick questions, or yes/no answers.
- Do not reuse a response within the category, and do not put the response's words inside its own clue.
- If the topic is nonsense or impossible to write accurately, still produce the closest sensible category.`;

const cache = new Map(); // normalized category name -> { name, clues }

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function stripLeadIn(response) {
  return response
    .trim()
    .replace(/^(what|who|where|when|which)\s+(is|are|was|were)\s+/i, '')
    .replace(/\?+$/, '')
    .trim();
}

/** Validate the parsed model output; returns normalized clues or throws. */
function validateClues(parsed) {
  const clues = parsed?.clues;
  if (!Array.isArray(clues) || clues.length !== 5) {
    throw new Error(`expected 5 clues, got ${Array.isArray(clues) ? clues.length : 'none'}`);
  }
  return clues.map((c, i) => {
    const clue = String(c.clue || '').trim();
    const response = stripLeadIn(String(c.response || ''));
    if (!clue || !response) throw new Error(`clue ${i + 1} is missing text`);
    if (Number(c.value) !== BOARD_VALUES[i]) throw new Error(`clue ${i + 1} has value ${c.value}, expected ${BOARD_VALUES[i]}`);
    return { value: BOARD_VALUES[i], clue, response };
  });
}

async function generateClues(category) {
  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Write the category for this topic: "${category}"` }],
    output_config: {
      effort: EFFORT,
      format: zodOutputFormat(CategorySchema),
    },
  });

  if (response.stop_reason === 'refusal') {
    const err = new Error('The writers declined that topic — try a different one');
    err.code = 'refused';
    err.status = 422;
    throw err;
  }
  if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
    throw new Error('model output could not be parsed');
  }

  return { clues: validateClues(response.parsed_output), usage: response.usage };
}

async function generateCategory(name, { fresh = false } = {}) {
  const key = name.toLowerCase();
  if (!fresh && cache.has(key)) return { ...cache.get(key), cached: true };

  const started = Date.now();
  let lastError = null;

  // One retry on malformed output; API errors propagate immediately
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { clues, usage } = await generateClues(name);
      const result = { name, clues };
      cache.set(key, result);
      console.log(
        `[generate] "${name}" ok in ${Date.now() - started}ms ` +
        `(attempt ${attempt}, ${usage.input_tokens} in / ${usage.output_tokens} out)`
      );
      return result;
    } catch (err) {
      if (err instanceof Anthropic.APIError || err.code === 'refused') throw err;
      lastError = err;
      console.warn(`[generate] "${name}" attempt ${attempt} malformed: ${err.message}`);
    }
  }

  const err = new Error(`The writers' room sent back something unusable (${lastError?.message}) — try again`);
  err.code = 'malformed';
  err.status = 502;
  throw err;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

const app = express();
app.use(cors());
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    credentialsDetected: credentialsDetected(),
    model: MODEL,
    effort: EFFORT,
    cachedCategories: cache.size,
  });
});

app.post('/api/generate-category', async (req, res) => {
  const name = normalizeName(req.body?.category);
  const fresh = Boolean(req.body?.fresh);

  if (!name) {
    return res.status(400).json({ error: 'Category name is required', code: 'bad_request' });
  }
  if (name.length > MAX_CATEGORY_LENGTH) {
    return res.status(400).json({ error: `Category name must be ${MAX_CATEGORY_LENGTH} characters or fewer`, code: 'bad_request' });
  }

  if (!credentialsDetected()) {
    return res.status(503).json({
      error: 'No API key configured — add ANTHROPIC_API_KEY to server/.env and restart the server',
      code: 'not_configured',
    });
  }

  try {
    const result = await generateCategory(name, { fresh });
    return res.json(result);
  } catch (err) {
    return res.status(statusFor(err)).json({ error: messageFor(err), code: codeFor(err) });
  }
});

// Map SDK errors to something the setup screen can show a player (most specific first)
function statusFor(err) {
  if (err instanceof Anthropic.AuthenticationError) return 401;
  if (err instanceof Anthropic.PermissionDeniedError) return 403;
  if (err instanceof Anthropic.RateLimitError) return 429;
  if (err instanceof Anthropic.BadRequestError) return 400;
  if (err instanceof Anthropic.APIConnectionError) return 502;
  if (err instanceof Anthropic.APIError) return err.status || 502;
  return err.status || 500;
}

function codeFor(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'auth';
  if (err instanceof Anthropic.RateLimitError) return 'rate_limited';
  if (err instanceof Anthropic.APIConnectionError) return 'connection';
  if (err instanceof Anthropic.APIError) return 'api_error';
  return err.code || 'server_error';
}

function messageFor(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'API key rejected — check ANTHROPIC_API_KEY in server/.env';
  if (err instanceof Anthropic.PermissionDeniedError) return 'This API key is not allowed to use that model';
  if (err instanceof Anthropic.RateLimitError) return 'Rate limited by Anthropic — try again in a moment';
  if (err instanceof Anthropic.APIConnectionError) return 'Could not reach Anthropic — check your internet connection';
  if (err instanceof Anthropic.APIError) return `Anthropic API error: ${err.message}`;
  if (err.code === 'refused' || err.code === 'malformed') return err.message;
  console.error('[generate] unexpected error:', err);
  return 'Something went wrong generating that category';
}

// After `npm run build`, serve the game itself so `npm start` is all game night needs
const distPath = path.join(here, '..', 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

app.listen(PORT, () => {
  const creds = credentialsDetected() ? 'API key found' : 'no API key — AI categories disabled until server/.env has ANTHROPIC_API_KEY';
  console.log(`Jeopardy server on http://localhost:${PORT}  (model: ${MODEL}, effort: ${EFFORT}, ${creds})`);
  if (fs.existsSync(distPath)) console.log(`Serving built game from client/dist — open http://localhost:${PORT}`);
});
