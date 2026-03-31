---
name: screen-designer
description: >
  Generate UI screen designs using dual engines: Stitch SDK (HTML/code output, iterative editing,
  design variants, design system consistency via DESIGN.md) and Nano Banana 2 (Gemini Flash Image
  for screenshot redesign, visual concepts, raster mockups).
  Creates high-fidelity mockups for mobile apps, web apps, desktop software, tablets, dashboards,
  and landing pages. For mobile (Expo/React Native), Stitch HTML serves as visual reference only.
  Invoke when user asks to "design a screen", "create a mockup", "redesign this screen",
  "generate UI", "app screen design", "web mockup", "dashboard design", "landing page design",
  "nano banana design", "stitch design", "screen-designer", or wants AI-generated screen designs.
user-invocable: true
argument-hint: "<description of the screen to design>"
compatibility: Requires Bun. Nano Banana needs GEMINI_API_KEY. Stitch needs STITCH_API_KEY.
tags: design, ui, mockup, nano-banana, gemini, stitch, mobile, web, desktop, tablet, screen, app, redesign, landing-page, dashboard, html, variants, design-system
---

# Screen Designer (Dual Engine)

Generate UI screen designs for **any platform** using two complementary engines:
- **Stitch SDK** — HTML/CSS output, iterative editing, variants, DESIGN.md consistency
- **Nano Banana 2** — Raster image generation, screenshot redesign, visual concepts

## Context

- Working directory: !`pwd`
- Gemini API key: !`test -n "$GEMINI_API_KEY$GOOGLE_AI_API_KEY" && echo "YES" || echo "NO — set GEMINI_API_KEY"`
- Stitch API key: !`test -n "$STITCH_API_KEY" && echo "YES" || echo "NO — set STITCH_API_KEY"`
- Nano Banana SDK: !`test -f "${CLAUDE_SKILL_DIR}/scripts/node_modules/@google/genai/package.json" && echo "YES" || echo "NO — run: cd ${CLAUDE_SKILL_DIR}/scripts && bun install"`
- Stitch SDK: !`test -f "${CLAUDE_SKILL_DIR}/scripts/node_modules/@google/stitch-sdk/package.json" && echo "YES" || echo "NO — run: cd ${CLAUDE_SKILL_DIR}/scripts && bun install"`

## Setup (first time only)

```bash
cd "${CLAUDE_SKILL_DIR}/scripts" && bun install
```

## Step 0: Select Engine

The core rule is simple:

> **Design system completo / intera app / multi-screen** → **Stitch** (DESIGN.md, iterazione, consistenza)
> **Singola schermata o componente** → **Nano Banana 2** (veloce, visuale, diretto)

| Scenario | Engine | Reason |
|----------|--------|--------|
| **Full app design / redesign** (multiple screens) | **Stitch** | Creates DESIGN.md, iterative editing, multi-screen consistency |
| **Design system creation** (colors, fonts, tokens) | **Stitch** | Generates extractable design tokens from Tailwind config |
| **Desktop/web** design with usable HTML | **Stitch** | HTML+Tailwind output is directly usable |
| **Iterative editing** ("change X on this screen") | **Stitch** | Built-in edit API, preserves context |
| **Design variants** (explore alternatives) | **Stitch** | REFINE/EXPLORE/REIMAGINE with aspect control |
| **Single screen** mockup (any platform) | **Nano Banana** | Faster, direct visual output |
| **Single component** visualization | **Nano Banana** | Quick visual concept |
| **Redesign from screenshot** | **Nano Banana** | Stitch SDK doesn't accept image input |
| **Visual concept / art / illustration** | **Nano Banana** | Image generation strength |
| User explicitly requests an engine | **Respect choice** | Always honor user preference |

**Mobile projects (Expo/React Native):** Stitch HTML is a **visual reference only** — it cannot be used directly in RN. Use Stitch when designing the full app to get: (1) consistent design system across all screens, (2) extractable design tokens (palette, fonts, spacing), (3) iterative editing. Use Nano Banana for quick single-screen mockups.

---

## Track A: Stitch Engine

### Step A1: Understand the request

Determine the **mode**, **device type**, and whether to use DESIGN.md:

**Mode:**
- **Generate**: New screen from text prompt (no project-id needed, one will be created)
- **Edit**: Modify an existing Stitch screen (**requires both --project-id AND --screen-id** from previous generation)
- **Variants**: Explore alternative designs. If --screen-id is given, **--project-id is also required**. Without --screen-id, a new base screen is generated first.

**Device type mapping:**

| Platform | DeviceType | Notes |
|----------|-----------|-------|
| iPhone, Android phone | `MOBILE` | HTML is reference only for RN/Expo |
| Desktop web, SaaS app | `DESKTOP` | HTML is directly usable |
| Dashboard, admin panel | `DESKTOP` | HTML is directly usable |
| Landing page, marketing | `DESKTOP` | HTML is directly usable |
| iPad, Android tablet | `TABLET` | HTML reference for native, usable for web |
| Flexible / unknown | `AGNOSTIC` | Let Stitch decide |

**Model selection:**
- `GEMINI_3_PRO` — Higher quality, slower (default)
- `GEMINI_3_FLASH` — Faster iteration, slightly lower quality

### Step A2: Build the prompt

Write a clear, specific prompt. Use Stitch prompting best practices:

- **Be specific**: "A SaaS pricing page with 3 tiers, annual/monthly toggle, and comparison table" not "a pricing page"
- **Set the vibe**: Use adjectives — "minimalist, warm, professional"
- **One change at a time**: For edits, focus on a single modification
- **Include color preferences**: "dark mode with purple accents" or exact hex values
- **Reference platform patterns**: "bottom navigation bar", "sidebar with icons", "hero section"

**For multi-screen flows**, create or reference a DESIGN.md (see DESIGN.md section below).

### Step A3: Generate

**New screen:**
```bash
bun "${CLAUDE_SKILL_DIR}/scripts/stitch-generate.ts" \
  --prompt "<description>" \
  --device-type "<MOBILE|DESKTOP|TABLET|AGNOSTIC>" \
  --model "<GEMINI_3_PRO|GEMINI_3_FLASH>" \
  --output "/tmp/screen-designer"
```

**With DESIGN.md for consistency:**
```bash
bun "${CLAUDE_SKILL_DIR}/scripts/stitch-generate.ts" \
  --prompt "<description>" \
  --device-type "MOBILE" \
  --design-md "./DESIGN.md" \
  --output "/tmp/screen-designer"
```

**Edit existing screen:**
```bash
bun "${CLAUDE_SKILL_DIR}/scripts/stitch-generate.ts" \
  --prompt "Change the header to a gradient from blue to purple" \
  --mode edit \
  --project-id "<from previous JSON output>" \
  --screen-id "<from previous JSON output>" \
  --output "/tmp/screen-designer"
```

**Generate variants:**
```bash
bun "${CLAUDE_SKILL_DIR}/scripts/stitch-generate.ts" \
  --prompt "Explore different layouts and color schemes" \
  --mode variants \
  --variant-count 3 \
  --creative-range "EXPLORE" \
  --aspects "LAYOUT,COLOR_SCHEME" \
  --project-id "<from previous JSON output>" \
  --screen-id "<from previous JSON output>" \
  --output "/tmp/screen-designer"
```

**Variant options:**

| Option | Values | Description |
|--------|--------|-------------|
| `--variant-count` | 1-5 | Number of variants (default: 3) |
| `--creative-range` | REFINE, EXPLORE, REIMAGINE | How far from original. REFINE = subtle tweaks, REIMAGINE = radical |
| `--aspects` | LAYOUT, COLOR_SCHEME, IMAGES, TEXT_FONT, TEXT_CONTENT | Which design aspects to vary (comma-separated) |

### Step A4: Show results

1. Read the generated **image** (PNG) to display the visual design — note: some screens may not return an image URL, in which case the imagePath field will be absent from JSON
2. Note the **HTML path** — mention it so the user can open it in a browser
3. **Capture projectId and screenId** from the JSON output — these are **required** for follow-up edits/variants
4. Present design choices and ask for feedback
5. For mobile projects: remind user the HTML is a visual reference, not production code

**Important:** Always pass `--project-id` and `--screen-id` from the previous JSON output when using `--mode edit` or `--mode variants` with an existing screen. The script validates these upfront and will error if missing.

### Stitch examples

**Mobile — Fitness app (reference for React Native):**
```bash
bun stitch-generate.ts -p "A fitness tracking app main screen: daily step counter ring, heart rate card, weekly activity bar chart, bottom tab navigation with Home/Workouts/Nutrition/Profile. Dark theme with purple (#6C5CE7) and teal (#00CEC9) accents on dark background (#1A1A2E)" -d MOBILE
```

**Desktop — SaaS dashboard (usable HTML):**
```bash
bun stitch-generate.ts -p "Analytics dashboard: left sidebar nav with icons, top KPI cards row (Revenue, Users, Conversion, MRR), full-width revenue line chart, two-column bottom section with user growth bar chart and geographic heatmap. Dark mode, Shadcn style, Inter font" -d DESKTOP -m GEMINI_3_PRO
```

**Landing page (usable HTML):**
```bash
bun stitch-generate.ts -p "AI writing assistant landing page: sticky nav, hero with large headline and email signup CTA, trusted-by logos bar, 3-column features grid, testimonial cards, 3-tier pricing table, footer. Dark theme with vibrant purple-to-cyan gradients, glassmorphism cards" -d DESKTOP
```

---

## Track B: Nano Banana Engine

### Step B1: Understand the request

Determine the **mode** and **platform**:

**Mode:**
- **New design**: User describes a screen from scratch
- **Redesign**: User provides a screenshot and wants it redesigned/improved
- **Multi-screen flow**: User wants multiple related screens

**Platform** (infer from context or ask):

| Platform | Device Frame | Aspect Ratio | Design System |
|----------|-------------|--------------|---------------|
| **iPhone** | iPhone 16 Pro | `9:16` | iOS 18 native, SF Pro, SF Symbols |
| **Android phone** | Pixel 9 Pro | `9:16` | Material Design 3, Roboto, Material Icons |
| **iPad** | iPad Pro 13" | `3:4` | iPadOS, sidebar + content, SF Pro |
| **Android tablet** | Galaxy Tab S10 | `5:8` | Material 3 adaptive layout |
| **Desktop web** | Browser 1440px | `16:9` | Custom/Tailwind/Shadcn |
| **Desktop app** | macOS window | `16:10` | macOS native / Electron |
| **Laptop web** | Browser 1280px | `16:9` | Responsive web |
| **Landing page** | Full page scroll | `9:16` or `1:2` | Marketing/hero-driven |
| **Dashboard** | Wide monitor | `21:9` or `16:9` | Data-dense, sidebar + grid |
| **Watch** | Apple Watch | `5:6` | watchOS, compact |

### Step B2: Build the JSON prompt

Build a structured JSON prompt tailored to the platform:

```json
{
  "image_type": "<platform_screen_type>",
  "device": {
    "frame": "<device name or browser chrome>",
    "display": "<display type>",
    "orientation": "<portrait|landscape>"
  },
  "app_concept": "<what the app/site does>",
  "screen": "<which screen>",
  "design_system": {
    "style": "<iOS 18 / Material 3 / Tailwind / Shadcn / custom>",
    "corners": "<border radius>",
    "shadows": "<shadow style>",
    "spacing": "<grid system>"
  },
  "color_palette": {
    "primary": "<hex>",
    "secondary": "<hex>",
    "background": "<hex>",
    "surface": "<hex>",
    "text": "<hex>"
  },
  "layout": {
    "navigation": "<top nav / sidebar / bottom tabs / hamburger>",
    "hero": "<main content area>",
    "sections": ["<section descriptions>"],
    "footer": "<footer or bottom nav>"
  },
  "visual_details": {
    "illustrations": "<icon/illustration style>",
    "typography": "<font choices>",
    "mood": "<visual mood>"
  }
}
```

**Platform-specific layout patterns:**

- **Mobile**: `bottom_nav` with 4-5 tabs, single-column, cards, swipeable carousels
- **Tablet**: Sidebar + content split, master-detail, multi-column grid
- **Desktop web**: Top navbar + hero + content sections + footer, sidebar optional
- **Dashboard**: Fixed sidebar nav + header + content grid with cards/charts/tables
- **Landing page**: Hero with CTA + features grid + testimonials + pricing + footer
- **Desktop app**: Title bar + toolbar + sidebar + main content + status bar

**For redesign with screenshot**, prepend this to the JSON prompt:
```
Redesign this screen. Keep the same functionality and information architecture,
but modernize the visual design with: <user's style preferences>.
Here is the current screen design to reimagine:
```

### Step B3: Generate the image

```bash
bun "${CLAUDE_SKILL_DIR}/scripts/generate.ts" \
  --prompt "<brief description for logging>" \
  --json-prompt '<full JSON prompt>' \
  --aspect-ratio "<ratio from device table>" \
  --output "/tmp/screen-designer" \
  --count <N>
```

**For redesign with screenshot:**
```bash
bun "${CLAUDE_SKILL_DIR}/scripts/generate.ts" \
  --prompt "<brief description>" \
  --json-prompt '<full JSON prompt>' \
  --screenshot "<path to screenshot>" \
  --aspect-ratio "<ratio>" \
  --output "/tmp/screen-designer"
```

### Step B4: Show results

1. Read the generated image(s) using the Read tool to display them
2. Present each screen with a brief description of design choices
3. Ask if they want variations, adjustments, or another screen

---

## DESIGN.md for Multi-Screen Consistency

When generating multiple related screens (especially with Stitch), create a `DESIGN.md` in the working directory to ensure visual consistency.

### Creating a DESIGN.md

Either:
1. **Generate with Stitch first** — after the first screen, extract the design tokens and create the DESIGN.md
2. **Write manually** — create from the user's requirements

### Template:

```markdown
# Design System — [App Name]

## Overview
[1-2 sentences: personality, density, aesthetic philosophy]

## Colors
- **Primary** (#hex): [role — CTAs, active states]
- **Secondary** (#hex): [role — supporting UI]
- **Background** (#hex): [role — page backgrounds]
- **Surface** (#hex): [role — cards, containers]
- **Text** (#hex): [role — primary text]
- **Error** (#hex): [role — validation, destructive]

## Typography
- **Headlines**: [font], [weight], [size range]
- **Body**: [font], [weight], [size]
- **Labels**: [font], [weight], [size]

## Components
- **Buttons**: [shape, variants, states]
- **Cards**: [elevation, radius, padding]
- **Navigation**: [pattern, active states]
- **Inputs**: [border, background, focus]

## Do's and Don'ts
- Do [guideline]
- Don't [anti-pattern]
```

### Usage with Stitch:
```bash
bun stitch-generate.ts -p "Settings page" --design-md ./DESIGN.md --project-id <id>
```

### Usage with Nano Banana:
Include the design system details directly in the JSON prompt's `color_palette`, `design_system`, and `visual_details` fields. Reuse the same values across all screens.

---

## Prompt Engineering Guidelines

### General (both engines):
- Always specify the device frame and platform context
- Include explicit color palette — never leave colors to chance
- Describe each layout section in natural language
- Add mood/atmosphere keywords (clean, bold, minimalist, glassmorphism, brutalist, etc.)
- For text-heavy screens, specify actual placeholder content

### Stitch-specific:
- Use adjectives to set the vibe — "sophisticated", "playful", "minimalist"
- Be specific about elements — "card with rounded corners and subtle shadow"
- One change per edit prompt — Stitch handles single focused changes best
- For variants: specify which aspects to vary (LAYOUT, COLOR_SCHEME, etc.)

### Nano Banana-specific:
- Use structured JSON for maximum quality
- For redesigns: always include screenshot via `--screenshot`
- Name the target style explicitly (iOS 18, Material 3, etc.)

### For multi-screen flows (both engines):
- Generate one screen at a time for consistency
- Use DESIGN.md (Stitch) or reuse same JSON palette (Nano Banana)
- Reference previous screens in the prompt

### Platform tips:
- **Mobile**: Focus on thumb-friendly zones, large touch targets, single-column
- **Web**: Include browser chrome for realism, consider responsive breakpoints
- **Dashboard**: Prioritize data density, use charts/graphs, dark mode works well
- **Landing page**: Hero image/gradient is critical, clear CTA hierarchy

## Troubleshooting

### Nano Banana:
- **"No image generated"**: Prompt may have triggered safety filters. Simplify the description.
- **Rate limited**: Script auto-retries after 10s. For batch, add pauses.
- **Low quality**: Use more detailed JSON prompts with explicit color palettes.
- **Wrong platform feel**: Be explicit about design system (iOS 18 vs Material 3 vs web).

### Stitch:
- **Timeout**: Generation can take up to 60s. Don't retry prematurely.
- **Rate limited [RATE_LIMITED]**: 350 standard / 50 experimental generations per month. Use GEMINI_3_FLASH for faster iteration.
- **Auth error [AUTH_FAILED]**: Check STITCH_API_KEY is set and valid.
- **Edit fails**: Both --project-id and --screen-id are **required** for edit mode. Get them from the JSON output of a previous generation.
- **Variants with existing screen**: --project-id is **required** when using --screen-id in variants mode.
- **"Unknown option" error**: The script validates all CLI flags. Run with `--help` to see valid options.
- **Invalid device-type/model/creative-range/aspects**: The script validates all enum values at startup. Valid values are shown in the error message.
- **Mobile HTML not matching RN**: Expected — Stitch HTML is a reference. Extract design tokens (colors, spacing, fonts) for your RN implementation.

### SDK not found:
```bash
cd "${CLAUDE_SKILL_DIR}/scripts" && bun install
```
