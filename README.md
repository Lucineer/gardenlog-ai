# Gardenlog Agent

You forget when you planted the peas. You need a record of what actually worked in your yard, not generic advice.

This agent stores your garden's history in your own Cloudflare account. It learns from your notes each season. It doesn't share your data, sell you features, or require a subscription.

Live instance: https://gardenlog-ai.casey-digennaro.workers.dev

---

## Purpose
Most garden tools require accounts, lock in your data, or give generic advice untested in your conditions. This is a local-first alternative that runs on your infrastructure. You control the data and the deployment.

## How It Works
This is a fork-first agent in the Cocapn Fleet. You deploy it to your own Cloudflare Worker. All logs, harvest weights, and plant records are stored in your private KV namespace. The agent uses your local data for context when answering questions.

It does not train on external garden blogs. It only uses what you've recorded about your own garden.

---

## Features
- **Plant Profiles**: Record varieties, planting dates, sun/water notes, and garden location
- **Harvest Logging**: Track yields, weights, and tasting notes for each crop
- **Zone-Based Calendar**: Adjusts planting windows for your hardiness zone
- **Companion Planting Reference**: Based on what you've previously grown together
- **Seasonal Memory**: References past successes and failures when you plan
- **Local Chat Interface**: Ask garden questions answered only from your recorded history

## Limitations
The agent starts with no prior knowledge of your garden. It becomes useful after you've logged at least one season of planting and harvest data.

## Quick Start
1.  Fork this repository
2.  Create a Cloudflare KV namespace named `GARDENLOG_STORE`
3.  Add your DeepSeek API key as a worker secret: `DEEPSEEK_API_KEY`
4.  Deploy to Cloudflare Workers
5.  Visit your worker URL to begin logging

It becomes more relevant as you add your own garden data over time.

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

---

<div>
Part of the <a href="https://the-fleet.casey-digennaro.workers.dev">Cocapn Fleet</a> • 
<a href="https://cocapn.ai">Cocapn Protocol</a><br>
Attribution: Superinstance & Lucineer (DiGennaro et al.)
</div>