---
name: screen-designer
description: >
  Generate UI screen designs for any platform using Nano Banana 2 (Gemini Flash Image).
  Creates high-fidelity mockups for mobile apps, web apps, desktop software, tablets, dashboards,
  and landing pages. Supports text-to-design and redesign from existing screenshots.
  Uses structured JSON prompting for maximum quality.
  Invoke when user asks to "design a screen", "create a mockup", "redesign this screen",
  "generate UI", "app screen design", "web mockup", "dashboard design", "landing page design",
  "nano banana design", "screen-designer", or wants AI-generated screen designs.
user-invocable: true
argument-hint: "<description of the screen to design>"
compatibility: Requires Bun, @google/genai SDK, GEMINI_API_KEY or GOOGLE_AI_API_KEY.
tags: design, ui, mockup, nano-banana, gemini, mobile, web, desktop, tablet, screen, app, redesign, landing-page, dashboard
---

# Screen Designer

Generate UI screen designs for **any platform** using **Nano Banana 2** (Gemini Flash Image) with structured JSON prompting.

## Context

- Working directory: !`pwd`
- API key available: !`test -n "$GEMINI_API_KEY$GOOGLE_AI_API_KEY" && echo "YES" || echo "NO — set GEMINI_API_KEY"`
- SDK installed: !`test -f "${CLAUDE_SKILL_DIR}/scripts/node_modules/@google/genai/package.json" && echo "YES" || echo "NO — run: cd ${CLAUDE_SKILL_DIR}/scripts && bun add @google/genai"`

## Setup (first time only)

```bash
cd "${CLAUDE_SKILL_DIR}/scripts" && bun add @google/genai
```

## Workflow

### Step 1: Understand the request

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

### Step 2: Build the JSON prompt

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

### Step 3: Generate the image

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

### Step 4: Show results

1. Read the generated image(s) using the Read tool to display them
2. Present each screen with a brief description of design choices
3. Ask if they want variations, adjustments, or another screen

## Prompt Engineering Guidelines

### General:
- Always specify the device frame and platform context
- Include explicit color palette — never leave colors to chance
- Describe each layout section in natural language
- Add mood/atmosphere keywords (clean, bold, minimalist, glassmorphism, brutalist, etc.)
- For text-heavy screens, specify actual placeholder content

### For redesigns from screenshots:
- Always include the screenshot via `--screenshot`
- Describe what to KEEP (functionality, structure) and what to CHANGE (style, colors, layout)
- Reference specific elements: "keep sidebar but add icons", "make the cards floating with shadows"
- Name the target style explicitly

### For multi-screen flows:
- Generate one screen at a time for consistency
- Reuse the same `color_palette` and `design_system` across all screens
- Reference previous screens in the prompt

### Platform-specific tips:
- **Mobile**: Focus on thumb-friendly zones, large touch targets, single-column
- **Web**: Include browser chrome in the prompt for realism, consider responsive breakpoints
- **Dashboard**: Prioritize data density, use charts/graphs, dark mode works well
- **Landing page**: Hero image/gradient is critical, clear CTA hierarchy

## Examples

### Mobile — Fitness dashboard (dark mode):
```bash
bun generate.ts -p "fitness dashboard" -a "9:16" \
  -j '{"image_type":"mobile_app_screen","device":{"frame":"iPhone 16 Pro","orientation":"portrait"},"app_concept":"Fitness tracking","screen":"Dashboard","design_system":{"style":"iOS 18","corners":"16px","spacing":"8pt grid"},"color_palette":{"primary":"#6C5CE7","secondary":"#00CEC9","background":"#1A1A2E","text":"#EAEAEA"},"layout":{"header":"Greeting + avatar","hero":"Activity ring chart","sections":["Heart rate card","Weekly workouts chart"],"footer":"Home, Workouts, Nutrition, Profile tabs"},"visual_details":{"mood":"Dark, premium, neon accents"}}'
```

### Desktop web — SaaS dashboard:
```bash
bun generate.ts -p "saas analytics dashboard" -a "16:9" \
  -j '{"image_type":"web_app_dashboard","device":{"frame":"Chrome browser 1440px","orientation":"landscape"},"app_concept":"SaaS analytics platform","screen":"Main dashboard","design_system":{"style":"Shadcn/Tailwind","corners":"8px","shadows":"subtle","spacing":"16px grid"},"color_palette":{"primary":"#6366F1","secondary":"#EC4899","background":"#09090B","surface":"#18181B","text":"#FAFAFA"},"layout":{"navigation":"Left sidebar with icons and labels, collapsible","hero":"KPI cards row (Revenue, Users, Conversion, MRR)","sections":["Revenue line chart spanning full width","Two-column: User growth bar chart + Geographic heatmap","Recent transactions table with status badges"],"footer":"None"},"visual_details":{"typography":"Inter, monospace for numbers","mood":"Professional dark mode, data-dense, clean"}}'
```

### Tablet — E-commerce product page:
```bash
bun generate.ts -p "ecommerce product iPad" -a "3:4" \
  -j '{"image_type":"tablet_app_screen","device":{"frame":"iPad Pro 13","orientation":"portrait"},"app_concept":"Premium e-commerce","screen":"Product detail","design_system":{"style":"iPadOS native","corners":"12px","spacing":"16pt"},"color_palette":{"primary":"#1A1A1A","secondary":"#D4AF37","background":"#FFFFFF","text":"#1A1A1A"},"layout":{"navigation":"Top bar with back, search, cart icon","hero":"Large product image gallery with thumbnails","sections":["Product title, price, ratings","Color/size selectors","Description accordion","Related products horizontal scroll"],"footer":"Sticky Add to Cart bar"},"visual_details":{"mood":"Luxury, clean, generous whitespace"}}'
```

### Landing page — AI startup:
```bash
bun generate.ts -p "ai startup landing page" -a "9:16" \
  -j '{"image_type":"landing_page","device":{"frame":"Full page","orientation":"portrait"},"app_concept":"AI writing assistant startup","screen":"Homepage","design_system":{"style":"Modern marketing","corners":"12px","shadows":"large, colorful","spacing":"generous sections"},"color_palette":{"primary":"#7C3AED","secondary":"#06B6D4","background":"#0F0F23","text":"#F8FAFC"},"layout":{"navigation":"Sticky top nav: Logo, Features, Pricing, Login, CTA button","hero":"Large headline + subtext + email input + CTA + hero screenshot","sections":["Logos bar: trusted by X companies","3-column features grid with icons","Before/after comparison","Testimonial cards carousel","Pricing 3-tier table"],"footer":"Links columns + newsletter signup"},"visual_details":{"illustrations":"Gradient blobs, glassmorphism cards","typography":"Cal Sans headings, Inter body","mood":"Futuristic, dark, vibrant gradients"}}'
```

### Redesign from screenshot:
```bash
bun generate.ts -p "modernize settings" -s "./current-settings.png" -a "9:16" \
  -j '{"image_type":"screen_redesign","redesign_instructions":"Modernize this screen with a cleaner layout, rounded card groups, and spacious design. Keep all functionality.","design_system":{"style":"iOS 18","corners":"12px","spacing":"16pt gaps"},"color_palette":{"primary":"#007AFF","background":"#F2F2F7","surface":"#FFFFFF","text":"#1C1C1E"},"visual_details":{"mood":"Clean, spacious, modern"}}'
```

## Troubleshooting

- **"No image generated"**: Prompt may have triggered safety filters. Simplify the description.
- **Rate limited**: Script auto-retries after 10s. For batch, add pauses.
- **SDK not found**: Run `cd "${CLAUDE_SKILL_DIR}/scripts" && bun add @google/genai`
- **Low quality**: Use more detailed JSON prompts. Nano Banana responds best to structured, explicit prompts.
- **Wrong platform feel**: Be explicit about the design system (iOS 18 vs Material 3 vs web).
