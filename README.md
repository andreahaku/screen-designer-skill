# Screen Designer Skill

A Claude Code skill that generates high-fidelity UI screen designs for **any platform** using [Nano Banana 2](https://blog.google/innovation-and-ai/technology/ai/nano-banana-2/) (Gemini Flash Image) with structured JSON prompting.

## What it does

- **Text to screen** — Describe a screen in natural language, get a production-quality mockup
- **Screenshot redesign** — Provide an existing app screenshot, get a modernized redesign
- **Multi-screen flows** — Generate consistent multi-screen experiences
- **Any platform** — Mobile (iOS/Android), web, desktop, tablet, dashboard, landing page, watch

## Example output

Generated with: `/screen-designer a fitness dashboard, dark mode, premium feel with neon accents`

The skill builds a structured JSON prompt behind the scenes, optimized for Nano Banana 2's JSON parsing capabilities, then generates and displays the result.

## Supported platforms

| Platform | Aspect Ratio | Design System |
|----------|-------------|---------------|
| iPhone | `9:16` | iOS 18, SF Pro |
| Android phone | `9:16` | Material Design 3 |
| iPad | `3:4` | iPadOS adaptive |
| Desktop web | `16:9` | Tailwind/Shadcn/custom |
| Dashboard | `16:9` / `21:9` | Data-dense, sidebar + grid |
| Landing page | `9:16` / `1:2` | Marketing/hero-driven |
| Desktop app | `16:10` | macOS native / Electron |
| Watch | `5:6` | watchOS compact |

## Requirements

- [Bun](https://bun.sh) runtime
- [Claude Code](https://claude.ai/claude-code) with skills support
- Google AI API key (`GEMINI_API_KEY` or `GOOGLE_AI_API_KEY` env var)

## Installation

### As a Claude Code skill (recommended)

```bash
# Clone into your skills directory
git clone https://github.com/andreahaku/screen-designer-skill.git ~/.claude/skills/screen-designer

# Install dependencies
cd ~/.claude/skills/screen-designer/scripts && bun install
```

### Manual setup

```bash
# Clone anywhere
git clone https://github.com/andreahaku/screen-designer-skill.git
cd screen-designer-skill/scripts
bun install

# Symlink to Claude Code skills
ln -s "$(pwd)/.." ~/.claude/skills/screen-designer
```

### Set your API key

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export GEMINI_API_KEY="your-google-ai-api-key"
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey).

## Usage

### In Claude Code

```
/screen-designer a fitness app dashboard with dark mode and neon accents

/screen-designer redesign this settings screen with a modern iOS 18 style
(attach a screenshot)

/screen-designer a SaaS analytics dashboard with sidebar navigation, dark theme

/screen-designer a landing page for an AI startup with gradient hero section
```

### CLI (standalone)

```bash
# New mobile screen
bun scripts/generate.ts \
  --prompt "fitness dashboard" \
  --json-prompt '{"image_type":"mobile_app_screen",...}' \
  --aspect-ratio "9:16" \
  --output ./designs

# Redesign from screenshot
bun scripts/generate.ts \
  --prompt "modernize this screen" \
  --screenshot ./current-app.png \
  --json-prompt '{"image_type":"screen_redesign",...}' \
  --output ./designs

# Multiple variations
bun scripts/generate.ts \
  --prompt "login screen" \
  --json-prompt '...' \
  --count 3
```

### CLI options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--prompt` | `-p` | Description of the screen (required) | — |
| `--screenshot` | `-s` | Path to existing screenshot for redesign | — |
| `--json-prompt` | `-j` | Pre-built JSON prompt (overrides text prompt for API) | — |
| `--aspect-ratio` | `-a` | Output aspect ratio | `9:16` |
| `--output` | `-o` | Output directory | `/tmp/screen-designer` |
| `--model` | `-m` | Gemini model ID | `gemini-2.5-flash-image` |
| `--count` | `-n` | Number of variations | `1` |

## How it works

1. **Claude interprets** your request and determines the platform, style, and layout
2. **Structured JSON prompt** is built using the UI mockup schema (inspired by the [json-prompt skill](https://github.com/andreahaku/json-prompt-skill)) — this is key to getting high-quality, consistent results from Nano Banana 2
3. **Nano Banana 2** (Gemini Flash Image) generates the screen via the Google GenAI API
4. **Results** are saved as PNG and displayed in Claude Code

### Why JSON prompting?

Nano Banana 2 has the best JSON parsing capabilities among image generation models. A structured prompt with explicit color palettes, layout sections, typography, and mood keywords produces dramatically better results than plain text descriptions.

```json
{
  "image_type": "mobile_app_screen",
  "device": { "frame": "iPhone 16 Pro" },
  "color_palette": { "primary": "#6C5CE7", "background": "#1A1A2E" },
  "layout": {
    "header": "Greeting + avatar",
    "hero": "Activity ring chart",
    "sections": ["Heart rate card", "Weekly chart"],
    "footer": "Tab bar: Home, Workouts, Profile"
  },
  "visual_details": { "mood": "Dark, premium, neon accents" }
}
```

## Tips

- **Be explicit about colors** — always provide hex values, don't leave palette to chance
- **Name the design system** — "iOS 18 native", "Material 3", "Tailwind" gives strong stylistic direction
- **Describe layout sections** — the more specific, the better the spatial arrangement
- **For redesigns** — describe what to keep and what to change separately
- **Multi-screen consistency** — generate one screen at a time, reuse the same palette and design system

## License

MIT

## Credits

- Powered by [Nano Banana 2](https://blog.google/innovation-and-ai/technology/ai/nano-banana-2/) (Google DeepMind)
- Built for [Claude Code](https://claude.ai/claude-code) (Anthropic)
- JSON prompting methodology from the [json-prompt skill](https://github.com/andreahaku/json-prompt-skill)
