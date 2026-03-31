# Screen Designer Skill (Dual Engine)

A Claude Code skill that generates high-fidelity UI screen designs for **any platform** using two complementary engines:

- **[Google Stitch SDK](https://stitch.withgoogle.com/)** — HTML/CSS output, iterative editing, design variants, multi-screen consistency via DESIGN.md
- **[Nano Banana 2](https://blog.google/innovation-and-ai/technology/ai/nano-banana-2/)** (Gemini Flash Image) — Raster image generation, screenshot redesign, visual concepts

## When to use which

> **Design system / full app / multi-screen** → **Stitch** (DESIGN.md, iteration, consistency)
> **Single screen or component** → **Nano Banana 2** (fast, visual, direct)

| Scenario | Engine |
|----------|--------|
| Full app design / multi-screen flow | Stitch |
| Design system creation | Stitch |
| Desktop/web with usable HTML | Stitch |
| Iterative editing | Stitch |
| Design variants | Stitch |
| Single screen mockup | Nano Banana |
| Single component visualization | Nano Banana |
| Redesign from screenshot | Nano Banana |
| Visual concept / art | Nano Banana |

**Mobile (Expo/React Native):** Stitch HTML serves as **visual reference only** — not usable directly in RN. Use Stitch for full app design systems; Nano Banana for quick single-screen mockups.

## Supported platforms

| Platform | Nano Banana (Aspect Ratio) | Stitch (DeviceType) |
|----------|---------------------------|---------------------|
| iPhone / Android | `9:16` | `MOBILE` |
| iPad / tablet | `3:4` / `5:8` | `TABLET` |
| Desktop web | `16:9` | `DESKTOP` |
| Dashboard | `16:9` / `21:9` | `DESKTOP` |
| Landing page | `9:16` / `1:2` | `DESKTOP` |
| Desktop app | `16:10` | `DESKTOP` |
| Watch | `5:6` | — |

## Requirements

- [Bun](https://bun.sh) runtime
- [Claude Code](https://claude.ai/claude-code) with skills support
- **Nano Banana:** Google AI API key (`GEMINI_API_KEY` or `GOOGLE_AI_API_KEY`)
- **Stitch:** Stitch API key (`STITCH_API_KEY`) — get from [stitch.withgoogle.com](https://stitch.withgoogle.com/)

## Installation

```bash
# Clone into your skills directory
git clone https://github.com/andreahaku/screen-designer-skill.git ~/.claude/skills/screen-designer

# Install dependencies (covers both engines)
cd ~/.claude/skills/screen-designer/scripts && bun install
```

### Set your API keys

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export GEMINI_API_KEY="your-google-ai-api-key"
export STITCH_API_KEY="your-stitch-api-key"
```

**How to get the keys:**
- **GEMINI_API_KEY**: Get from [Google AI Studio](https://aistudio.google.com/apikey) (free)
- **STITCH_API_KEY**: Sign in at [stitch.withgoogle.com](https://stitch.withgoogle.com/) → Settings (gear icon) → API Keys → Create key. Requires a Google account. Free tier: 350 standard + 50 experimental generations/month.

## Usage

### In Claude Code

```
# Single screen (Nano Banana)
/screen-designer a fitness app dashboard with dark mode and neon accents

# Full app design (Stitch)
/screen-designer design system for a task management app: home, tasks list, task detail, settings

# Redesign from screenshot (Nano Banana)
/screen-designer redesign this settings screen with modern iOS 18 style

# Desktop web (Stitch — usable HTML)
/screen-designer a SaaS analytics dashboard with sidebar navigation, dark theme
```

### CLI — Nano Banana (raster images)

```bash
bun scripts/generate.ts \
  --prompt "fitness dashboard" \
  --json-prompt '{"image_type":"mobile_app_screen",...}' \
  --aspect-ratio "9:16"

# Redesign from screenshot
bun scripts/generate.ts \
  --prompt "modernize this screen" \
  --screenshot ./current-app.png

# Multiple variations
bun scripts/generate.ts --prompt "login screen" --count 3
```

### CLI — Stitch (HTML + screenshots)

```bash
# Generate a new screen
bun scripts/stitch-generate.ts \
  --prompt "A fitness dashboard with steps, heart rate, and weekly chart" \
  --device-type MOBILE

# Edit an existing screen
bun scripts/stitch-generate.ts \
  --prompt "Change to dark mode" \
  --mode edit --project-id abc --screen-id xyz

# Generate variants
bun scripts/stitch-generate.ts \
  --prompt "Explore different layouts" \
  --mode variants --variant-count 3 \
  --creative-range EXPLORE --aspects LAYOUT,COLOR_SCHEME \
  --project-id abc --screen-id xyz

# With DESIGN.md for consistency
bun scripts/stitch-generate.ts \
  --prompt "Settings page" \
  --design-md ./DESIGN.md --project-id abc
```

### CLI options — Stitch

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--prompt` | `-p` | Screen description (required) | — |
| `--device-type` | `-d` | MOBILE, DESKTOP, TABLET, AGNOSTIC | `MOBILE` |
| `--model` | `-m` | GEMINI_3_PRO, GEMINI_3_FLASH | `GEMINI_3_PRO` |
| `--output` | `-o` | Output directory | `/tmp/screen-designer` |
| `--project-id` | | Reuse existing Stitch project. **Required** for edit mode and variants with --screen-id | — |
| `--screen-id` | | Target screen for edit/variants. **Required** for edit mode | — |
| `--mode` | | generate, edit, variants | `generate` |
| `--variant-count` | | 1-5 variants (validated) | `3` |
| `--creative-range` | | REFINE, EXPLORE, REIMAGINE (validated) | — |
| `--aspects` | | LAYOUT, COLOR_SCHEME, IMAGES, TEXT_FONT, TEXT_CONTENT (validated) | — |
| `--design-md` | | Path to DESIGN.md for consistency | — |

### CLI options — Nano Banana

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--prompt` | `-p` | Screen description (required) | — |
| `--screenshot` | `-s` | Screenshot for redesign | — |
| `--json-prompt` | `-j` | Structured JSON prompt | — |
| `--aspect-ratio` | `-a` | Output aspect ratio | `9:16` |
| `--output` | `-o` | Output directory | `/tmp/screen-designer` |
| `--model` | `-m` | Gemini model ID | `gemini-2.5-flash-image` |
| `--count` | `-n` | Number of variations | `1` |

## How it works

### Nano Banana 2 (raster images)
1. Claude builds a **structured JSON prompt** (palette, layout, typography, mood)
2. Gemini Flash Image generates a high-fidelity raster mockup
3. Result saved as PNG

### Stitch SDK (HTML + screenshots)
1. Claude creates a Stitch project and generates screens from text prompts
2. Stitch returns **HTML+Tailwind CSS** and a **screenshot image** (download URLs, fetched automatically)
3. Screens can be iteratively edited (`--mode edit`) or varied (`--mode variants`) using `--project-id` and `--screen-id` from the previous generation's JSON output
4. DESIGN.md ensures consistency across multiple screens
5. All inputs are validated: device types, models, creative ranges, aspects, and variant counts (1-5)

### DESIGN.md

A markdown file encoding your design system (colors, typography, spacing, components) that Stitch reads to enforce consistency across all generated screens. Create one for multi-screen projects.

## Tips

- **Be explicit about colors** — provide hex values, don't leave palette to chance
- **Name the design system** — "iOS 18", "Material 3", "Tailwind/Shadcn" gives strong direction
- **For Stitch edits** — one change per prompt for best results; always save `projectId` and `screenId` from JSON output
- **For Stitch variants** — use REFINE for tweaks, REIMAGINE for radical exploration; specify `--aspects` to control what changes
- **Multi-screen** — always use DESIGN.md to maintain visual consistency
- **Mobile (RN/Expo)** — Stitch HTML is a visual reference, not production code; extract design tokens for your implementation

## License

MIT

## Credits

- Powered by [Google Stitch SDK](https://stitch.withgoogle.com/) and [Nano Banana 2](https://blog.google/innovation-and-ai/technology/ai/nano-banana-2/) (Google DeepMind)
- Built for [Claude Code](https://claude.ai/claude-code) (Anthropic)
