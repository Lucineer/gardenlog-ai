# Gardenlog Agent

A personal garden assistant that tracks plants, harvests, and observations over seasons. It runs on your own Cloudflare Worker, stores data in your KV namespace, and uses AI to provide context-specific guidance based on your garden's history.

Use it to remember planting dates, track yields, plan rotations, and understand what works in your specific microclimate.

## How It Works

This is a Cocapn fleet agent—a self-contained application that you deploy to Cloudflare Workers. All garden data (plants, harvests, notes) is stored in your own KV database. The agent uses DeepSeek's AI model to answer questions based solely on your logged garden history and hardiness zone, not generic internet advice.

## What It Does

- **Plant Profiles**: Track varieties, planting dates, sun/water needs, and growth stages.
- **Harvest Logging**: Record yields, weights, and quality notes per plant per season.
- **Garden Calendar**: Zone-aware planting dates that adjust based on your local conditions.
- **Companion Planting**: Reference which plants grow well together (or shouldn't).
- **Seasonal Memory**: Remembers what worked and didn't in previous seasons.
- **Chat Interface**: Ask questions like "why are my tomato leaves yellow?" and get answers grounded in your garden's history.

## Quick Start

1. Fork this repository
2. Create a Cloudflare KV namespace named `GARDENLOG_STORE`
3. Add your DeepSeek API key as a secret: `DEEPSEEK_API_KEY`
4. Deploy to Cloudflare Workers
5. Visit your worker URL and start logging plants

Your data stays in your KV store. The agent improves as you add more seasons.

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Landing page |
| `GET` | `/app.html` | Garden management interface |
| `POST` | `/api/chat` | Chat with your garden assistant (SSE streaming) |
| `GET/POST` | `/api/plants` | List or create plants |
| `DELETE` | `/api/plants/:id` | Remove a plant |
| `GET/POST` | `/api/harvest` | List or log harvests |
| `GET` | `/api/garden/calendar` | Planting calendar with month/zone filters |
| `GET/POST` | `/api/journal` | Garden observations and notes |

## Limitations

The agent's memory is only as good as the data you provide. It learns from your logged plants, harvests, and notes—if you don't record something, it won't remember it. First-season guidance will be more generic until you build up your garden's history.

---

<div>
  <p>Part of the <a href="https://the-fleet.casey-digennaro.workers.dev" target="_blank">Cocapn Fleet</a> • Built by <a href="https://cocapn.ai" target="_blank">Superinstance & Lucineer (DiGennaro et al.)</a></p>
  <p>MIT Licensed • Cloudflare Workers • Fork-first deployment</p>
</div>