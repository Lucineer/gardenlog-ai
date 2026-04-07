# gardenlog-ai 🪴

You forget when you planted the peas. You need a record of what actually worked in *your* yard, not generic blog advice.

This is a single-file application you run yourself on Cloudflare Workers. It stores your garden's history in your own Cloudflare account. It uses your past notes to provide reminders and answers.

**Live demo:** [gardenlog-ai.casey-digennaro.workers.dev](https://gardenlog-ai.casey-digennaro.workers.dev)

## What It Does

Your soil, shade, and habits are unique. This tool serves as a persistent notebook for your garden. You log your plants, harvests, and observations. Later, you can ask it questions like "when did I plant tomatoes last year?" or "what grew well in the back bed?" It answers using only the data you provided.

## Quick Start

1.  **Fork** this repository. This creates your own copy.
2.  **Deploy** to Cloudflare Workers (free tier eligible):
    *   Create a KV namespace named `GARDENLOG_STORE`.
    *   Add your `DEEPSEEK_API_KEY` as a Worker secret.
    *   Deploy the single `worker.js` file.
3.  **Use it:** Start adding your plants and notes via the web interface. The AI features will begin working once you have data.

## How It Works

You host your own instance. All data is stored in your Cloudflare KV namespace and is never sent elsewhere. The application has zero npm dependencies—it's one file. You can modify its prompts, logic, or style directly in your fork.

## Features

*   **Plant Logging:** Record varieties, planting dates, locations, and notes.
*   **Harvest Tracking:** Log yields and taste notes for future reference.
*   **Contextual Memory:** The AI assistant answers questions based solely on your past entries.
*   **Planting Calendar:** Views filtered by your hardiness zone and planting history.
*   **Journal:** Add free-form notes for each season.
*   **Data Ownership:** You control all storage. No accounts, subscriptions, or data sharing.

## Limitations

The system is only as useful as the data you put in. It starts empty. AI responses are confined to your logged entries; it cannot access external gardening databases or real-time weather. All data entry is manual.

## API Reference

The worker provides the following routes:

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/`  | Landing page. |
| `GET`  | `/app.html` | Main application interface. |
| `POST` | `/api/chat` | Streaming chat endpoint (uses your garden data). |
| `GET`  | `/api/plants` | List all plants. |
| `POST` | `/api/plants` | Add a new plant. |
| `DELETE` | `/api/plants/:id` | Remove a plant entry. |
| `GET`  | `/api/harvest` | List harvests. |
| `POST` | `/api/harvest` | Log a harvest. |
| `GET`  | `/api/garden/calendar` | Get a planting calendar view. |
| `GET`  | `/api/journal` | List journal entries. |
| `POST` | `/api/journal` | Add a journal entry. |

## License

MIT. This is a fork-first agent in the Cocapn Fleet.

<div style="text-align:center;padding:16px;color:#64748b;font-size:.8rem"><a href="https://the-fleet.casey-digennaro.workers.dev" style="color:#64748b">The Fleet</a> &middot; <a href="https://cocapn.ai" style="color:#64748b">Cocapn</a></div>