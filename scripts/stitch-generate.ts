#!/usr/bin/env bun
/**
 * stitch-generate — Generate UI designs using Google Stitch SDK.
 * Produces HTML + screenshot for web/desktop, or reference designs for mobile.
 * Supports generate, edit, and variants modes with DESIGN.md consistency.
 *
 * Usage:
 *   bun stitch-generate.ts --prompt "..." [--device-type MOBILE] [--mode generate|edit|variants]
 */

import { stitch, StitchError } from '@google/stitch-sdk';
import type { Project, Screen } from '@google/stitch-sdk';
import { parseArgs } from 'util';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ─── Types ─────────────────────────────────────────────────────────────────

type DeviceType = "DEVICE_TYPE_UNSPECIFIED" | "MOBILE" | "DESKTOP" | "TABLET" | "AGNOSTIC";
type ModelId = "MODEL_ID_UNSPECIFIED" | "GEMINI_3_PRO" | "GEMINI_3_FLASH";
type CreativeRange = "CREATIVE_RANGE_UNSPECIFIED" | "REFINE" | "EXPLORE" | "REIMAGINE";
type VariantAspect = "VARIANT_ASPECT_UNSPECIFIED" | "LAYOUT" | "COLOR_SCHEME" | "IMAGES" | "TEXT_FONT" | "TEXT_CONTENT";

const VALID_DEVICE_TYPES: DeviceType[] = ["DEVICE_TYPE_UNSPECIFIED", "MOBILE", "DESKTOP", "TABLET", "AGNOSTIC"];
const VALID_MODELS: ModelId[] = ["MODEL_ID_UNSPECIFIED", "GEMINI_3_PRO", "GEMINI_3_FLASH"];
const VALID_CREATIVE_RANGES: CreativeRange[] = ["CREATIVE_RANGE_UNSPECIFIED", "REFINE", "EXPLORE", "REIMAGINE"];
const VALID_ASPECTS: VariantAspect[] = ["VARIANT_ASPECT_UNSPECIFIED", "LAYOUT", "COLOR_SCHEME", "IMAGES", "TEXT_FONT", "TEXT_CONTENT"];

interface StitchOptions {
  prompt: string;
  deviceType: DeviceType;
  model: ModelId;
  outputDir: string;
  projectId?: string;
  screenId?: string;
  mode: 'generate' | 'edit' | 'variants';
  variantCount: number;
  creativeRange?: CreativeRange;
  aspects?: VariantAspect[];
  designMdPath?: string;
}

interface ScreenResult {
  htmlPath?: string;
  imagePath?: string;
  screenId: string;
  projectId: string;
  index: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_DEVICE: DeviceType = 'MOBILE';
const DEFAULT_MODEL: ModelId = 'GEMINI_3_PRO';
const DEFAULT_OUTPUT = '/tmp/screen-designer';

// ─── Helpers ───────────────────────────────────────────────────────────────

async function downloadToFile(url: string, filePath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(filePath, buffer);
}

function buildPrompt(basePrompt: string, designMdPath?: string): string {
  if (!designMdPath || !existsSync(designMdPath)) {
    return basePrompt;
  }

  const designMd = readFileSync(designMdPath, 'utf-8');
  return `Design System Context (from DESIGN.md):
---
${designMd}
---

Generate a screen following the above design system:
${basePrompt}`;
}

async function saveScreenArtifacts(
  screen: Screen,
  projectId: string,
  index: number,
  outputDir: string,
): Promise<ScreenResult> {
  const timestamp = Date.now();
  const prefix = `screen-${index + 1}-${timestamp}`;

  let imagePath: string | undefined;
  let htmlPath: string | undefined;

  // Download screenshot image
  const imageUrl = await screen.getImage();
  if (imageUrl) {
    imagePath = join(outputDir, `${prefix}.png`);
    await downloadToFile(imageUrl, imagePath);
  } else {
    console.warn(`  ⚠ No screenshot URL returned for screen ${screen.id}`);
  }

  // Download HTML
  const htmlUrl = await screen.getHtml();
  if (htmlUrl) {
    htmlPath = join(outputDir, `${prefix}.html`);
    await downloadToFile(htmlUrl, htmlPath);
  } else {
    console.warn(`  ⚠ No HTML URL returned for screen ${screen.id}`);
  }

  return {
    htmlPath,
    imagePath,
    screenId: screen.id,
    projectId,
    index,
  };
}

// ─── Core: Generate / Edit / Variants ──────────────────────────────────────

async function runGenerate(opts: StitchOptions): Promise<ScreenResult[]> {
  const prompt = buildPrompt(opts.prompt, opts.designMdPath);
  const results: ScreenResult[] = [];

  // Validate required IDs for edit/variants modes BEFORE creating project
  if (opts.mode === 'edit') {
    if (!opts.projectId) {
      throw new Error('Edit mode requires --project-id (from previous generation)');
    }
    if (!opts.screenId) {
      throw new Error('Edit mode requires --screen-id (from previous generation)');
    }
  }
  if (opts.mode === 'variants' && opts.screenId && !opts.projectId) {
    throw new Error('When using --screen-id in variants mode, --project-id is also required');
  }

  // Get or create project
  let project: Project;
  if (opts.projectId) {
    project = stitch.project(opts.projectId);
    console.log(`  Using existing project: ${opts.projectId}`);
  } else {
    const title = opts.prompt.slice(0, 50).replace(/[^a-zA-Z0-9 ]/g, '');
    project = await stitch.createProject(title || 'Screen Designer');
    console.log(`  Created project: ${project.id}`);
  }

  const projectId = project.id;

  if (opts.mode === 'generate') {
    console.log(`  Generating screen...`);
    const screen = await project.generate(prompt, opts.deviceType, opts.model);
    console.log(`  Screen generated: ${screen.id}`);
    const result = await saveScreenArtifacts(screen, projectId, 0, opts.outputDir);
    results.push(result);
  } else if (opts.mode === 'edit') {
    console.log(`  Loading screen ${opts.screenId}...`);
    const screen = await project.getScreen(opts.screenId!);
    console.log(`  Editing screen...`);
    const edited = await screen.edit(prompt, opts.deviceType, opts.model);
    console.log(`  Edit complete: ${edited.id}`);
    const result = await saveScreenArtifacts(edited, projectId, 0, opts.outputDir);
    results.push(result);
  } else if (opts.mode === 'variants') {
    // For variants, we need a base screen
    let baseScreen: Screen;
    if (opts.screenId) {
      baseScreen = await project.getScreen(opts.screenId);
      console.log(`  Using existing screen: ${opts.screenId}`);
    } else {
      console.log(`  Generating base screen...`);
      baseScreen = await project.generate(prompt, opts.deviceType, opts.model);
      console.log(`  Base screen: ${baseScreen.id}`);
      const baseResult = await saveScreenArtifacts(baseScreen, projectId, 0, opts.outputDir);
      results.push(baseResult);
    }

    console.log(`  Generating ${opts.variantCount} variants...`);
    const variantOptions: {
      variantCount?: number;
      creativeRange?: CreativeRange;
      aspects?: VariantAspect[];
    } = {
      variantCount: opts.variantCount,
    };
    if (opts.creativeRange) {
      variantOptions.creativeRange = opts.creativeRange;
    }
    if (opts.aspects && opts.aspects.length > 0) {
      variantOptions.aspects = opts.aspects;
    }

    const variants = await baseScreen.variants(
      prompt,
      variantOptions,
      opts.deviceType,
      opts.model,
    );

    for (let i = 0; i < variants.length; i++) {
      const startIdx = opts.screenId ? i : i + 1; // offset if base was already saved
      const result = await saveScreenArtifacts(variants[i], projectId, startIdx, opts.outputDir);
      results.push(result);
      console.log(`  Variant ${i + 1}: ${variants[i].id}`);
    }
  }

  return results;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  let values: Record<string, any>;
  try {
    const parsed = parseArgs({
      options: {
        prompt:           { type: 'string', short: 'p' },
        'device-type':    { type: 'string', short: 'd' },
        model:            { type: 'string', short: 'm' },
        output:           { type: 'string', short: 'o' },
        'project-id':     { type: 'string' },
        'screen-id':      { type: 'string' },
        mode:             { type: 'string' },
        'variant-count':  { type: 'string' },
        'creative-range': { type: 'string' },
        aspects:          { type: 'string' },
        'design-md':      { type: 'string' },
        help:             { type: 'boolean', short: 'h' },
      },
      strict: true,
      allowPositionals: false,
    });
    values = parsed.values;
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    console.error('Run with --help for usage information.');
    process.exit(1);
  }

  if (values.help || !values.prompt) {
    console.log(`
Usage: bun stitch-generate.ts --prompt "..." [options]

Options:
  -p, --prompt          Text description of the screen to generate (required)
  -d, --device-type     MOBILE | DESKTOP | TABLET | AGNOSTIC (default: MOBILE)
  -m, --model           GEMINI_3_PRO | GEMINI_3_FLASH (default: GEMINI_3_PRO)
  -o, --output          Output directory (default: /tmp/screen-designer)
      --project-id      Reuse existing Stitch project
      --screen-id       Target screen for edit/variants mode
      --mode            generate | edit | variants (default: generate)
      --variant-count   Number of variants, 1-5 (default: 3)
      --creative-range  REFINE | EXPLORE | REIMAGINE
      --aspects         Comma-separated: LAYOUT,COLOR_SCHEME,IMAGES,TEXT_FONT,TEXT_CONTENT
      --design-md       Path to DESIGN.md for design system consistency
  -h, --help            Show this help

Environment:
  STITCH_API_KEY must be set.

Examples:
  # New mobile screen
  bun stitch-generate.ts -p "A fitness dashboard with daily steps and heart rate" -d MOBILE

  # Desktop web with Stitch Pro model
  bun stitch-generate.ts -p "SaaS pricing page with 3 tiers" -d DESKTOP -m GEMINI_3_PRO

  # Edit existing screen
  bun stitch-generate.ts -p "Change color scheme to dark mode" --mode edit --project-id abc --screen-id xyz

  # Generate 3 layout variants
  bun stitch-generate.ts -p "Explore layouts" --mode variants --variant-count 3 --creative-range EXPLORE --aspects LAYOUT,COLOR_SCHEME --project-id abc --screen-id xyz

  # With DESIGN.md for consistency
  bun stitch-generate.ts -p "Settings page" --design-md ./DESIGN.md --project-id abc
`);
    process.exit(values.help ? 0 : 1);
  }

  if (!process.env.STITCH_API_KEY) {
    console.error('Error: STITCH_API_KEY must be set.');
    process.exit(1);
  }

  // Validate mode
  const mode = (values.mode || 'generate') as StitchOptions['mode'];
  if (!['generate', 'edit', 'variants'].includes(mode)) {
    console.error(`Error: Invalid mode "${mode}". Use generate, edit, or variants.`);
    process.exit(1);
  }

  // Validate device type
  const deviceType = (values['device-type'] || DEFAULT_DEVICE) as DeviceType;
  if (!VALID_DEVICE_TYPES.includes(deviceType)) {
    console.error(`Error: Invalid device-type "${deviceType}". Use: ${VALID_DEVICE_TYPES.join(', ')}`);
    process.exit(1);
  }

  // Validate model
  const model = (values.model || DEFAULT_MODEL) as ModelId;
  if (!VALID_MODELS.includes(model)) {
    console.error(`Error: Invalid model "${model}". Use: ${VALID_MODELS.join(', ')}`);
    process.exit(1);
  }

  // Validate variant count
  const variantCount = parseInt(values['variant-count'] || '3', 10);
  if (isNaN(variantCount) || variantCount < 1 || variantCount > 5) {
    console.error('Error: --variant-count must be a number between 1 and 5.');
    process.exit(1);
  }

  // Validate creative range
  let creativeRange: CreativeRange | undefined;
  if (values['creative-range']) {
    creativeRange = values['creative-range'] as CreativeRange;
    if (!VALID_CREATIVE_RANGES.includes(creativeRange)) {
      console.error(`Error: Invalid creative-range "${creativeRange}". Use: REFINE, EXPLORE, REIMAGINE`);
      process.exit(1);
    }
  }

  // Parse and validate aspects
  let aspects: VariantAspect[] | undefined;
  if (values.aspects) {
    aspects = values.aspects.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) as VariantAspect[];
    for (const a of aspects) {
      if (!VALID_ASPECTS.includes(a)) {
        console.error(`Error: Invalid aspect "${a}". Use: ${VALID_ASPECTS.join(', ')}`);
        process.exit(1);
      }
    }
  }

  const opts: StitchOptions = {
    prompt: values.prompt!,
    deviceType,
    model,
    outputDir: values.output || DEFAULT_OUTPUT,
    projectId: values['project-id'],
    screenId: values['screen-id'],
    mode,
    variantCount,
    creativeRange,
    aspects,
    designMdPath: values['design-md'],
  };

  if (!existsSync(opts.outputDir)) {
    mkdirSync(opts.outputDir, { recursive: true });
  }

  console.log(`Stitch Engine — ${opts.mode} mode`);
  console.log(`Device: ${opts.deviceType}`);
  console.log(`Model: ${opts.model}`);
  console.log(`Output: ${opts.outputDir}`);
  if (opts.designMdPath) {
    console.log(`Design system: ${opts.designMdPath}`);
  }
  console.log('');

  try {
    const results = await runGenerate(opts);

    console.log('');
    console.log(`Done. ${results.length} screen(s) generated.`);

    if (results.length > 0) {
      const summary = {
        screens: results.map(r => ({
          ...(r.htmlPath && { htmlPath: r.htmlPath }),
          ...(r.imagePath && { imagePath: r.imagePath }),
          ...(r.imagePath && { path: r.imagePath }),         // backward compat with generate.ts
          ...(r.imagePath && { mimeType: 'image/png' }),     // backward compat
          screenId: r.screenId,
          projectId: r.projectId,
          index: r.index,
        })),
        outputDir: opts.outputDir,
        projectId: results[0].projectId,
        count: results.length,
        engine: 'stitch',
      };
      console.log('\n---JSON---');
      console.log(JSON.stringify(summary, null, 2));
    }
  } catch (err) {
    if (err instanceof StitchError) {
      console.error(`Stitch error [${err.code}]: ${err.message}`);
      if (err.code === 'RATE_LIMITED') {
        console.error('Rate limited. Wait and retry, or use GEMINI_3_FLASH for lower latency.');
      } else if (err.code === 'AUTH_FAILED') {
        console.error('Check your STITCH_API_KEY.');
      }
    } else {
      console.error('Fatal:', err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  } finally {
    await stitch.close();
  }
}

main();
