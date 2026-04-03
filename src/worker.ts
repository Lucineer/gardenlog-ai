import { addNode, addEdge, traverse, crossDomainQuery, findPath, domainStats, getDomainNodes } from './lib/knowledge-graph.js';
import { loadSeedIntoKG, FLEET_REPOS, loadAllSeeds } from './lib/seed-loader.js';
/**
 * gardenlog.ai — Cloudflare Worker
 *
 * A vessel for gardeners. The cocapn remembers every plant, every harvest, every season.
 *
 * Routes:
 *   POST /api/chat           — SSE streaming with DeepSeek
 *   GET/POST /api/plants     — CRUD plants
 *   DELETE /api/plants/:id   — remove a plant
 *   POST /api/harvest        — log harvest
 *   GET  /api/harvest        — list harvests
 *   GET  /api/garden/calendar  — planting/harvesting calendar
 *   GET  /api/garden/weather   — weather-based recommendations
 *   GET  /api/journal        — garden journal entries
 *   POST /api/journal        — create journal entry
 *   GET  /                    — landing page
 */

import {
  type PlantProfile, type HarvestEntry, type PlantMemoryEntry,
  getCompanions, getCalendarForMonth, getCalendarForPlant, getFullCalendar,
  generateId as plantId, getCurrentSeason,
} from './plants/tracker';

import {
  type GardenBed, type SeasonalPlan, type SoilAmendment, type SoilReading,
  type CropRotation, type BedPlant, type PlannedPlanting, type SuccessionPlan,
  getPlantFamily, getNextRotation, getRotationOrder,
  getSuccessionPresets, generateSuccessionDates, getSoilAdvice,
  generateId as gardenId, getBedArea, estimatePlantCapacity,
} from './garden/planner';

// ─── Env / Types ─────────────────────────────────────────────────────────────

interface Env {
  DEEPSEEK_API_KEY: string;
  GARDEN_KV: KVNamespace;
}

interface GardenStore {
  plants: PlantProfile[];
  harvests: HarvestEntry[];
  memories: PlantMemoryEntry[];
  beds: GardenBed[];
  plans: SeasonalPlan[];
  rotations: CropRotation[];
  amendments: SoilAmendment[];
  soilReadings: SoilReading[];
  journal: JournalEntry[];
}

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  tags: string[];
  photoUrl?: string;
}

interface WeatherRec {
  condition: string;
  advice: string;
  urgency: 'info' | 'tip' | 'warning';
}

const KV_KEY = 'gardenlog:store';
const CURRENT_VERSION = '0.1.0';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function html(content: string): Response {
  return new Response(content, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  });
}

async function getStore(kv: KVNamespace): Promise<GardenStore> {
  const raw = await kv.get(KV_KEY);
  if (!raw) return emptyStore();
  try { return JSON.parse(raw) as GardenStore; }
  catch { return emptyStore(); }
}

async function putStore(kv: KVNamespace, store: GardenStore): Promise<void> {
  await kv.put(KV_KEY, JSON.stringify(store));
}

function emptyStore(): GardenStore {
  return {
    plants: [], harvests: [], memories: [], beds: [], plans: [],
    rotations: [], amendments: [], soilReadings: [], journal: [],
  };
}

// ─── Weather Recommendations ─────────────────────────────────────────────────

function getWeatherRecommendations(month: number, _zone: string): WeatherRec[] {
  const recs: WeatherRec[] = [];

  if (month >= 3 && month <= 5) {
    recs.push({ condition: 'Spring Frost Risk', advice: 'Keep frost cloth handy. Harden off seedlings gradually. Watch forecasts for late freezes.', urgency: 'warning' });
    recs.push({ condition: 'Warming Soil', advice: 'Soil is warming — good time to direct sow peas, spinach, radish. Use a soil thermometer to confirm 50F+.', urgency: 'tip' });
    recs.push({ condition: 'Rain Season', advice: 'Reduce watering schedule if rain is consistent. Ensure beds drain well to prevent root rot.', urgency: 'info' });
  }
  if (month >= 6 && month <= 8) {
    recs.push({ condition: 'Heat Wave', advice: 'Water deeply in early morning. Mulch heavily. Provide shade cloth for heat-sensitive crops like lettuce.', urgency: 'warning' });
    recs.push({ condition: 'Drought Risk', advice: 'Prioritize watering fruiting plants. Use drip irrigation or soaker hoses. Consider Olla pots.', urgency: 'warning' });
    recs.push({ condition: 'Pest Pressure', advice: 'Check undersides of leaves regularly. Use companion planting. Hand-pick tomato hornworms early morning.', urgency: 'tip' });
    recs.push({ condition: 'Succession Planting', advice: 'Sow another round of beans, cucumbers, and basil for fall harvest.', urgency: 'info' });
  }
  if (month >= 9 && month <= 11) {
    recs.push({ condition: 'First Frost Approaching', advice: 'Harvest green tomatoes before frost. Cover tender herbs. Plant garlic before ground freezes.', urgency: 'warning' });
    recs.push({ condition: 'Fall Planting Window', advice: 'Direct sow cool crops: spinach, radish, lettuce. Plant cover crops in empty beds.', urgency: 'tip' });
    recs.push({ condition: 'Soil Building', advice: 'Add compost and amendments now so they break down over winter. Get a soil test.', urgency: 'info' });
  }
  if (month === 12 || month <= 2) {
    recs.push({ condition: 'Planning Season', advice: 'Order seeds. Map out garden beds and crop rotation. Start onions and peppers indoors (zones 5-7).', urgency: 'info' });
    recs.push({ condition: 'Indoor Growing', advice: 'Grow sprouts and microgreens. Start heat-loving seeds indoors with grow lights.', urgency: 'tip' });
    recs.push({ condition: 'Tool Maintenance', advice: 'Clean, sharpen, and oil tools. Inventory supplies for spring.', urgency: 'info' });
  }

  return recs;
}

// ─── Chat Handler ────────────────────────────────────────────────────────────

async function handleChat(req: Request, env: Env, store: GardenStore): Promise<Response> {
  let body: { message?: string };
  try { body = await req.json() as { message?: string }; }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const userMessage = (body.message ?? '').trim();
  if (!userMessage) return json({ error: 'Empty message' }, 400);

  // Build garden context for the AI
  const plantNames = store.plants.map(p => `${p.name} (${p.variety}, stage: ${p.stage})`).join(', ') || 'none yet';
  const recentHarvests = store.harvests.slice(-5).map(h => `${h.plantName}: ${h.amount}`).join(', ') || 'none';
  const recentJournal = store.journal.slice(-3).map(j => `${j.date}: ${j.title}`).join('\n') || 'none';

  const systemPrompt = `You are the gardenlog.ai cocapn — a wise, warm gardening companion. You remember every plant, every harvest, every season. You help gardeners succeed in THEIR microclimate.

## Current Garden
- Plants: ${plantNames}
- Recent harvests: ${recentHarvests}
- Recent journal: ${recentJournal}
- Season: ${getCurrentSeason()}

## Your Style
- Warm, encouraging, practical
- Reference specific plants in their garden when relevant
- Give actionable advice
- Use botanical knowledge but explain simply
- If they ask about a plant problem, diagnose step by step
- Celebrate their harvests!`;

  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return json({ error: 'DEEPSEEK_API_KEY not configured' }, 500);
  }

  const llmRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    }),
  });

  if (!llmRes.ok) {
    const errText = await llmRes.text().catch(() => 'unknown');
    return json({ error: `LLM ${llmRes.status}: ${errText}` }, 502);
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    let fullResponse = '';
    try {
      const reader = llmRes.body?.getReader();
      if (!reader) { await writer.close(); return; }
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') break;
          try {
            const chunk = JSON.parse(payload) as {
              choices: Array<{ delta?: { content?: string }; finish_reason?: string }>;
            };
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              await writer.write(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
    }
    await writer.write(encoder.encode('data: [DONE]\n\n'));
    await writer.close();
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// ─── Router ──────────────────────────────────────────────────────────────────

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

  if (path === '/health') {
    return new Response(JSON.stringify({ status: 'ok', repo: 'gardenlog-ai', timestamp: Date.now() }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
    const method = req.method;
    // ── Knowledge Graph (Phase 4B) ──
    if (path.startsWith('/api/kg')) {
      const _kj = (d: any, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      if (path === '/api/kg' && method === 'GET') return _kj({ domain: url.searchParams.get('domain') || 'gardenlog-ai', nodes: await getDomainNodes(env, url.searchParams.get('domain') || 'gardenlog-ai') });
      if (path === '/api/kg/explore' && method === 'GET') {
        const nid = url.searchParams.get('node');
        if (!nid) return _kj({ error: 'node required' }, 400);
        return _kj(await traverse(env, nid, parseInt(url.searchParams.get('depth') || '2'), url.searchParams.get('domain') || undefined));
      }
      if (path === '/api/kg/cross' && method === 'GET') return _kj({ query: url.searchParams.get('query') || '', domain: url.searchParams.get('domain') || 'gardenlog-ai', results: await crossDomainQuery(env, url.searchParams.get('query') || '', url.searchParams.get('domain') || 'gardenlog-ai') });
      if (path === '/api/kg/domains' && method === 'GET') return _kj(await domainStats(env));
      if (path === '/api/kg/sync' && method === 'POST') return _kj(await loadAllSeeds(env, FLEET_REPOS));
      if (path === '/api/kg/seed' && method === 'POST') { const b = await req.json(); return _kj(await loadSeedIntoKG(env, b, b.domain || 'gardenlog-ai')); }
    }


    // CORS
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // GET / — landing page
    if (method === 'GET' && (path === '/' || path === '/index.html')) {
      const store = await getStore(env.GARDEN_KV);
      // Inline the HTML from public/app.html or serve it
      // For now we'll import the HTML string — in production, bundled by wrangler
      const { LANDING_HTML } = await import('./landing');
      return html(LANDING_HTML);
    }

    // ─── Chat ──────────────────────────────────────────────────────────────

    if (method === 'POST' && path === '/api/chat') {
      const store = await getStore(env.GARDEN_KV);
      return handleChat(req, env, store);
    }

    // ─── Plants CRUD ───────────────────────────────────────────────────────

    // GET /api/plants — list all plants
    if (method === 'GET' && path === '/api/plants') {
      const store = await getStore(env.GARDEN_KV);
      return json(store.plants);
    }

    // POST /api/plants — create or update a plant
    if (method === 'POST' && path === '/api/plants') {
      let body: Partial<PlantProfile>;
      try { body = await req.json() as Partial<PlantProfile>; }
      catch { return json({ error: 'Invalid JSON' }, 400); }

      if (!body.name) return json({ error: 'Plant name is required' }, 400);

      const store = await getStore(env.GARDEN_KV);

      if (body.id) {
        // Update existing
        const idx = store.plants.findIndex(p => p.id === body.id);
        if (idx === -1) return json({ error: 'Plant not found' }, 404);
        store.plants[idx] = { ...store.plants[idx], ...body } as PlantProfile;
        await putStore(env.GARDEN_KV, store);
        return json(store.plants[idx]);
      }

      // Create new
      const plant: PlantProfile = {
        id: plantId(),
        name: body.name,
        variety: body.variety ?? '',
        zone: body.zone ?? '7',
        sunNeeds: body.sunNeeds ?? 'full',
        waterNeeds: body.waterNeeds ?? 'moderate',
        companions: body.companions ?? [],
        plantedDate: body.plantedDate ?? new Date().toISOString().split('T')[0],
        wateringScheduleDays: body.wateringScheduleDays ?? 3,
        notes: body.notes ?? '',
        stage: body.stage ?? 'seed',
      };
      store.plants.push(plant);
      await putStore(env.GARDEN_KV, store);
      return json(plant, 201);
    }

    // DELETE /api/plants/:id
    if (method === 'DELETE' && path.startsWith('/api/plants/')) {
      const id = path.split('/').pop();
      if (!id) return json({ error: 'Plant ID required' }, 400);
      const store = await getStore(env.GARDEN_KV);
      const before = store.plants.length;
      store.plants = store.plants.filter(p => p.id !== id);
      if (store.plants.length === before) return json({ error: 'Plant not found' }, 404);
      await putStore(env.GARDEN_KV, store);
      return json({ ok: true });
    }

    // GET /api/plants/companions/:name
    if (method === 'GET' && path.startsWith('/api/plants/companions/')) {
      const name = decodeURIComponent(path.split('/').pop() ?? '');
      return json(getCompanions(name));
    }

    // ─── Harvests ──────────────────────────────────────────────────────────

    // GET /api/harvest
    if (method === 'GET' && path === '/api/harvest') {
      const store = await getStore(env.GARDEN_KV);
      const plantFilter = url.searchParams.get('plant');
      const harvests = plantFilter
        ? store.harvests.filter(h => h.plantName.toLowerCase() === plantFilter.toLowerCase())
        : store.harvests;
      return json(harvests);
    }

    // POST /api/harvest
    if (method === 'POST' && path === '/api/harvest') {
      let body: Partial<HarvestEntry>;
      try { body = await req.json() as Partial<HarvestEntry>; }
      catch { return json({ error: 'Invalid JSON' }, 400); }

      if (!body.plantName || !body.amount) return json({ error: 'plantName and amount required' }, 400);

      const store = await getStore(env.GARDEN_KV);
      const entry: HarvestEntry = {
        id: plantId(),
        plantId: body.plantId ?? '',
        plantName: body.plantName,
        amount: body.amount,
        date: body.date ?? new Date().toISOString().split('T')[0],
        notes: body.notes ?? '',
        season: body.season ?? getCurrentSeason(),
        quality: body.quality ?? 4,
      };
      store.harvests.push(entry);
      await putStore(env.GARDEN_KV, store);
      return json(entry, 201);
    }

    // ─── Garden Calendar ───────────────────────────────────────────────────

    // GET /api/garden/calendar
    if (method === 'GET' && path === '/api/garden/calendar') {
      const month = url.searchParams.get('month');
      const plant = url.searchParams.get('plant');
      const zone = url.searchParams.get('zone');

      if (month) return json(getCalendarForMonth(parseInt(month), zone ?? undefined));
      if (plant) return json(getCalendarForPlant(plant));
      return json(getFullCalendar());
    }

    // ─── Weather Recommendations ───────────────────────────────────────────

    // GET /api/garden/weather
    if (method === 'GET' && path === '/api/garden/weather') {
      const month = parseInt(url.searchParams.get('month') ?? '') || new Date().getMonth() + 1;
      const zone = url.searchParams.get('zone') ?? '7';
      return json({
        month,
        zone,
        season: getCurrentSeason(),
        recommendations: getWeatherRecommendations(month, zone),
      });
    }

    // ─── Garden Beds ──────────────────────────────────────────────────────

    // GET /api/garden/beds
    if (method === 'GET' && path === '/api/garden/beds') {
      const store = await getStore(env.GARDEN_KV);
      return json(store.beds.map(b => ({ ...b, area: getBedArea(b) })));
    }

    // POST /api/garden/beds
    if (method === 'POST' && path === '/api/garden/beds') {
      let body: Partial<GardenBed>;
      try { body = await req.json() as Partial<GardenBed>; }
      catch { return json({ error: 'Invalid JSON' }, 400); }
      if (!body.name) return json({ error: 'Bed name required' }, 400);
      const store = await getStore(env.GARDEN_KV);
      const bed: GardenBed = {
        id: gardenId(),
        name: body.name,
        width: body.width ?? 4,
        length: body.length ?? 8,
        location: body.location ?? 'full_sun',
        plants: body.plants ?? [],
      };
      store.beds.push(bed);
      await putStore(env.GARDEN_KV, store);
      return json(bed, 201);
    }

    // ─── Soil ─────────────────────────────────────────────────────────────

    // GET /api/garden/soil
    if (method === 'GET' && path === '/api/garden/soil') {
      const store = await getStore(env.GARDEN_KV);
      const bedId = url.searchParams.get('bedId');
      const readings = bedId ? store.soilReadings.filter(r => r.bedId === bedId) : store.soilReadings;
      const amendments = bedId ? store.amendments.filter(a => a.bedId === bedId) : store.amendments;
      const latest = readings.sort((a, b) => b.date.localeCompare(a.date))[0];
      return json({
        readings,
        amendments,
        latestReading: latest ?? null,
        advice: latest ? getSoilAdvice(latest) : [],
      });
    }

    // POST /api/garden/soil
    if (method === 'POST' && path === '/api/garden/soil') {
      let body: Partial<SoilReading>;
      try { body = await req.json() as Partial<SoilReading>; }
      catch { return json({ error: 'Invalid JSON' }, 400); }
      if (!body.bedId) return json({ error: 'bedId required' }, 400);
      const store = await getStore(env.GARDEN_KV);
      const reading: SoilReading = {
        id: gardenId(),
        date: body.date ?? new Date().toISOString().split('T')[0],
        bedId: body.bedId,
        ph: body.ph,
        nitrogen: body.nitrogen,
        phosphorus: body.phosphorus,
        potassium: body.potassium,
        organicMatter: body.organicMatter,
        moisture: body.moisture,
        notes: body.notes ?? '',
      };
      store.soilReadings.push(reading);
      await putStore(env.GARDEN_KV, store);
      return json({ reading, advice: getSoilAdvice(reading) }, 201);
    }

    // ─── Journal ──────────────────────────────────────────────────────────

    // GET /api/journal
    if (method === 'GET' && path === '/api/journal') {
      const store = await getStore(env.GARDEN_KV);
      const tag = url.searchParams.get('tag');
      const entries = tag
        ? store.journal.filter(j => j.tags.includes(tag))
        : store.journal;
      return json(entries.sort((a, b) => b.date.localeCompare(a.date)));
    }

    // POST /api/journal
    if (method === 'POST' && path === '/api/journal') {
      let body: Partial<JournalEntry>;
      try { body = await req.json() as Partial<JournalEntry>; }
      catch { return json({ error: 'Invalid JSON' }, 400); }
      if (!body.title) return json({ error: 'Title required' }, 400);
      const store = await getStore(env.GARDEN_KV);
      const entry: JournalEntry = {
        id: gardenId(),
        date: body.date ?? new Date().toISOString().split('T')[0],
        title: body.title,
        body: body.body ?? '',
        tags: body.tags ?? [],
        photoUrl: body.photoUrl,
      };
      store.journal.push(entry);
      await putStore(env.GARDEN_KV, store);
      return json(entry, 201);
    }

    // ─── Plant Memory ─────────────────────────────────────────────────────

    // GET /api/memory
    if (method === 'GET' && path === '/api/memory') {
      const store = await getStore(env.GARDEN_KV);
      return json(store.memories);
    }

    // POST /api/memory
    if (method === 'POST' && path === '/api/memory') {
      let body: Partial<PlantMemoryEntry>;
      try { body = await req.json() as Partial<PlantMemoryEntry>; }
      catch { return json({ error: 'Invalid JSON' }, 400); }
      if (!body.plantName) return json({ error: 'plantName required' }, 400);
      const store = await getStore(env.GARDEN_KV);
      store.memories.push({
        plantName: body.plantName,
        variety: body.variety,
        year: body.year ?? new Date().getFullYear(),
        season: body.season ?? getCurrentSeason(),
        outcome: body.outcome ?? 'survived',
        yieldRating: body.yieldRating ?? 3,
        notes: body.notes ?? '',
        pests: body.pests,
        diseases: body.diseases,
      });
      await putStore(env.GARDEN_KV, store);
      return json({ ok: true }, 201);
    }

    // ─── Rotation & Succession ────────────────────────────────────────────

    // GET /api/garden/rotation
    if (method === 'GET' && path === '/api/garden/rotation') {
      return json({ order: getRotationOrder(), families: 'Use POST to get next rotation for a bed' });
    }

    // GET /api/garden/succession
    if (method === 'GET' && path === '/api/garden/succession') {
      return json(getSuccessionPresets());
    }

    // POST /api/garden/succession
    if (method === 'POST' && path === '/api/garden/succession') {

  if (path === '/api/efficiency' && request.method === 'GET') {    return new Response(JSON.stringify({ totalCached: 0, totalHits: 0, cacheHitRate: 0, tokensSaved: 0, repo: 'gardenlog-ai', timestamp: Date.now() }), { headers: { 'Content-Type': 'application/json', ...corsHeaders() } });  }
      let body: { plantName?: string; startDate?: string; intervalDays?: number; count?: number };
      try { body = await req.json() as typeof body; }
      catch { return json({ error: 'Invalid JSON' }, 400); }
      if (!body.plantName || !body.startDate) return json({ error: 'plantName and startDate required' }, 400);
      const presets = getSuccessionPresets();
      const preset = presets[body.plantName.toLowerCase()] ?? { intervalDays: 14, count: 3 };
      const dates = generateSuccessionDates(
        body.startDate,
        body.intervalDays ?? preset.intervalDays,
        body.count ?? preset.count,
      );
      return json({ plantName: body.plantName, plantingDates: dates });
    }

    // ─── 404 ──────────────────────────────────────────────────────────────

    return json({ error: 'Not found', version: CURRENT_VERSION }, 404);
  },
} satisfies ExportedHandler<Env>;
