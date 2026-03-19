#!/usr/bin/env bun
/**
 * screen-designer — Generate mobile screen designs using Nano Banana 2 (Gemini 3.1 Flash Image).
 * Supports text-to-design and screenshot-based redesign.
 *
 * Usage:
 *   bun generate.ts --prompt "..." [--screenshot path] [--aspect 9:16] [--output dir] [--model model] [--count N]
 */

import { GoogleGenAI } from '@google/genai';
import { parseArgs } from 'util';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';

// ─── Types ─────────────────────────────────────────────────────────────────

interface GenerateOptions {
  prompt: string;
  screenshot?: string;       // path to existing app screenshot for redesign
  aspectRatio: string;       // default: 9:16 (mobile portrait)
  outputDir: string;
  model: string;
  count: number;
  jsonPrompt?: string;       // pre-built JSON prompt (from /json-prompt skill)
}

interface GeneratedScreen {
  filePath: string;
  mimeType: string;
  index: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'gemini-2.5-flash-image';
const DEFAULT_ASPECT = '9:16';
const DEFAULT_OUTPUT = '/tmp/screen-designer';

// ─── Image Generation ──────────────────────────────────────────────────────

async function generateScreen(
  ai: GoogleGenAI,
  opts: GenerateOptions,
  index: number
): Promise<GeneratedScreen> {
  const contents: any[] = [];

  // If screenshot provided, include it as reference image for redesign
  if (opts.screenshot) {
    const imgData = readFileSync(opts.screenshot);
    const ext = extname(opts.screenshot).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    };
    const mimeType = mimeMap[ext] || 'image/png';

    contents.push({
      inlineData: {
        data: imgData.toString('base64'),
        mimeType,
      },
    });
  }

  // Build the prompt text
  const promptText = opts.jsonPrompt || opts.prompt;
  contents.push({ text: promptText });

  let response;
  try {
    response = await ai.models.generateContent({
      model: opts.model,
      contents,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      console.error(`Rate limited. Waiting 10s before retry...`);
      await new Promise(r => setTimeout(r, 10000));
      response = await ai.models.generateContent({
        model: opts.model,
        contents,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });
    } else {
      throw err;
    }
  }

  // Extract image from response
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error('No image generated. Try a different prompt.');
  }

  // Also collect any text parts (descriptions, suggestions)
  const textParts: string[] = [];

  for (const part of parts) {
    if (part.text) {
      textParts.push(part.text);
    }
    if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('image/')) {
      const ext = part.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';
      const timestamp = Date.now();
      const fileName = `screen-${index + 1}-${timestamp}.${ext}`;
      const filePath = join(opts.outputDir, fileName);

      writeFileSync(filePath, Buffer.from(part.inlineData.data, 'base64'));

      if (textParts.length > 0) {
        const metaPath = join(opts.outputDir, `screen-${index + 1}-${timestamp}.txt`);
        writeFileSync(metaPath, textParts.join('\n'));
      }

      return {
        filePath,
        mimeType: part.inlineData.mimeType,
        index,
      };
    }
  }

  throw new Error('No image found in response. The model returned only text.');
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const { values } = parseArgs({
    options: {
      prompt: { type: 'string', short: 'p' },
      screenshot: { type: 'string', short: 's' },
      'aspect-ratio': { type: 'string', short: 'a' },
      output: { type: 'string', short: 'o' },
      model: { type: 'string', short: 'm' },
      count: { type: 'string', short: 'n' },
      'json-prompt': { type: 'string', short: 'j' },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (values.help || !values.prompt) {
    console.log(`
Usage: bun generate.ts --prompt "..." [options]

Options:
  -p, --prompt        Text description of the screen to generate (required)
  -s, --screenshot    Path to existing app screenshot for redesign
  -a, --aspect-ratio  Aspect ratio (default: 9:16 for mobile portrait)
  -o, --output        Output directory (default: /tmp/screen-designer)
  -m, --model         Gemini model (default: gemini-2.5-flash-image)
  -n, --count         Number of variations to generate (default: 1)
  -j, --json-prompt   Pre-built JSON prompt string (overrides --prompt for API call)
  -h, --help          Show this help

Environment:
  GEMINI_API_KEY or GOOGLE_AI_API_KEY must be set.

Examples:
  # New design from description
  bun generate.ts -p "A fitness app dashboard with dark mode, showing daily steps, heart rate, and calories"

  # Redesign from screenshot
  bun generate.ts -p "Modernize this screen with a glassmorphism style" -s ./current-app.png

  # Multiple variations
  bun generate.ts -p "Login screen for a banking app" -n 3

  # Custom JSON prompt
  bun generate.ts -p "fitness dashboard" -j '{"image_type":"mobile_app_screen",...}'
`);
    process.exit(values.help ? 0 : 1);
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY or GOOGLE_AI_API_KEY must be set.');
    process.exit(1);
  }

  const opts: GenerateOptions = {
    prompt: values.prompt!,
    screenshot: values.screenshot,
    aspectRatio: values['aspect-ratio'] || DEFAULT_ASPECT,
    outputDir: values.output || DEFAULT_OUTPUT,
    model: values.model || DEFAULT_MODEL,
    count: parseInt(values.count || '1', 10),
    jsonPrompt: values['json-prompt'],
  };

  // Ensure output directory exists
  if (!existsSync(opts.outputDir)) {
    mkdirSync(opts.outputDir, { recursive: true });
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log(`Generating ${opts.count} screen(s)...`);
  console.log(`Model: ${opts.model}`);
  console.log(`Aspect: ${opts.aspectRatio}`);
  if (opts.screenshot) {
    console.log(`Reference: ${opts.screenshot}`);
  }
  console.log(`Output: ${opts.outputDir}`);
  console.log('');

  const results: GeneratedScreen[] = [];

  for (let i = 0; i < opts.count; i++) {
    try {
      console.log(`Generating screen ${i + 1}/${opts.count}...`);
      const result = await generateScreen(ai, opts, i);
      results.push(result);
      console.log(`  ✓ ${result.filePath}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Failed: ${msg}`);
    }
  }

  console.log('');
  console.log(`Done. ${results.length}/${opts.count} screens generated.`);

  // Output results as JSON for skill consumption
  if (results.length > 0) {
    const summary = {
      screens: results.map(r => ({
        path: r.filePath,
        mimeType: r.mimeType,
        index: r.index,
      })),
      outputDir: opts.outputDir,
      count: results.length,
    };
    console.log('\n---JSON---');
    console.log(JSON.stringify(summary, null, 2));
  }
}

main().catch(err => {
  console.error('Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
