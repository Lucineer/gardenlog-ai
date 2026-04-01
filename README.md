# gardenlog.ai

A vessel for gardeners. The cocapn remembers every plant, every harvest, every season. It learns your microclimate.

Built on [Cloudflare Workers](https://workers.cloudflare.com/) with KV storage and DeepSeek AI.

## Features

- **Plant Tracker** — profiles with variety, zone, sun/water needs, companions, growth stages
- **Planting Calendar** — zone-aware calendar telling you what to plant and when
- **Companion Planting** — database of which plants grow well together (and which don't)
- **Harvest Log** — track yields per plant per season with quality ratings
- **Garden Journal** — notes, observations, and memories with tags
- **Weather Wisdom** — seasonal recommendations tailored to your hardiness zone
- **Garden Chat** — ask the cocapn anything: "why are my tomato leaves yellow?"
- **Crop Rotation** — automated rotation guidance by plant family
- **Succession Planting** — stagger plantings for continuous harvest
- **Soil Health** — track pH, nutrients, organic matter, and get amendment advice
- **Plant Memory** — remembers what worked and what didn't season over season

## Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Landing page |
| `GET` | `/app.html` | Full garden UI |
| `POST` | `/api/chat` | SSE streaming chat with DeepSeek |
| `GET/POST` | `/api/plants` | List / create plants |
| `DELETE` | `/api/plants/:id` | Remove a plant |
| `GET` | `/api/plants/companions/:name` | Companion planting lookup |
| `GET/POST` | `/api/harvest` | List / log harvests |
| `GET` | `/api/garden/calendar` | Planting calendar (?month=N&plant=name&zone=N) |
| `GET` | `/api/garden/weather` | Weather recommendations (?month=N&zone=N) |
| `GET/POST` | `/api/garden/beds` | Garden bed management |
| `GET/POST` | `/api/garden/soil` | Soil readings and amendments |
| `GET/POST` | `/api/journal` | Garden journal entries |
| `GET/POST` | `/api/memory` | Plant memory (season outcomes) |
| `GET` | `/api/garden/rotation` | Crop rotation guidance |
| `GET/POST` | `/api/garden/succession` | Succession planting plans |

## Setup

```bash
# Install dependencies
npm install

# Set your DeepSeek API key
wrangler secret put DEEPSEEK_API_KEY

# Create a KV namespace and update wrangler.toml with the ID
wrangler kv:namespace create "GARDEN_KV"

# Run locally
npm run dev

# Deploy
npm run deploy
```

## Project Structure

```
src/
  worker.ts          # Cloudflare Worker — all API routes + SSE chat
  landing.ts         # Landing page HTML
  plants/
    tracker.ts       # PlantProfile, PlantingCalendar, CompanionPlanting, HarvestTracker, PlantMemory
  garden/
    planner.ts       # GardenLayout, SeasonalPlan, SuccessionPlanting, SoilHealthTracker, CropRotation
public/
  app.html           # Full green-themed UI (forest green, sage, cream)
seed/                # cocapn universal seed (parent framework)
```

## UI Colors

| Name | Hex | Use |
|------|-----|-----|
| Forest | `#2D5016` | Primary, headers, buttons |
| Sage | `#8FBC8F` | Accents, secondary buttons |
| Cream | `#FFF8F0` | Background |
| Bark | `#5C4033` | Body text |
| Moss | `#4A7C59` | Subheadings, links |

## Author

**Superinstance** — a cocapn vessel
