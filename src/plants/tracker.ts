/**
 * Plant Tracker — the cocapn remembers every plant, every harvest, every season.
 *
 * PlantProfile, PlantingCalendar, CompanionPlanting, HarvestTracker, PlantMemory.
 * Pure data layer — no I/O, no framework deps. Used by the worker.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlantProfile {
  id: string;
  name: string;
  variety: string;
  zone: string;              // USDA hardiness zone e.g. "7b"
  sunNeeds: 'full' | 'partial' | 'shade';
  waterNeeds: 'low' | 'moderate' | 'high';
  companions: string[];      // plant names that grow well nearby
  plantedDate: string;       // ISO date
  wateringScheduleDays: number;
  notes: string;
  stage: 'seed' | 'sprout' | 'vegetative' | 'flowering' | 'fruiting' | 'harvested' | 'dormant';
}

export interface HarvestEntry {
  id: string;
  plantId: string;
  plantName: string;
  amount: string;            // e.g. "2.5 lbs", "12 tomatoes"
  date: string;              // ISO date
  notes: string;
  season: string;            // e.g. "Spring 2026"
  quality: 1 | 2 | 3 | 4 | 5;
}

export interface PlantMemoryEntry {
  plantName: string;
  variety?: string;
  year: number;
  season: string;
  outcome: 'thrived' | 'survived' | 'struggled' | 'died';
  yieldRating: 1 | 2 | 3 | 4 | 5;
  notes: string;
  pests?: string[];
  diseases?: string[];
}

export interface CalendarEntry {
  month: number;             // 1-12
  plantName: string;
  action: 'start_indoor' | 'transplant' | 'direct_sow' | 'harvest_window';
  zone: string;
  notes: string;
}

// ─── Companion Planting Database ─────────────────────────────────────────────

const COMPANION_DB: Record<string, { friends: string[]; foes: string[] }> = {
  tomato:     { friends: ['basil', 'marigold', 'carrot', 'garlic', 'parsley'], foes: ['corn', 'fennel', 'cabbage'] },
  pepper:     { friends: ['basil', 'tomato', 'carrot', 'onion'], foes: ['fennel', 'beans'] },
  cucumber:   { friends: ['beans', 'corn', 'peas', 'sunflower', 'radish'], foes: ['potato', 'sage'] },
  carrot:     { friends: ['onion', 'leek', 'rosemary', 'sage', 'lettuce'], foes: ['dill'] },
  lettuce:    { friends: ['carrot', 'radish', 'strawberry', 'chive'], foes: ['celery'] },
  beans:      { friends: ['corn', 'cucumber', 'potato', 'carrot'], foes: ['onion', 'garlic', 'fennel'] },
  corn:       { friends: ['beans', 'cucumber', 'squash', 'peas'], foes: ['tomato'] },
  potato:     { friends: ['beans', 'corn', 'cabbage', 'marigold'], foes: ['cucumber', 'tomato', 'sunflower'] },
  basil:      { friends: ['tomato', 'pepper', 'oregano', 'marigold'], foes: ['sage', 'rue'] },
  squash:     { friends: ['corn', 'beans', 'marigold', 'nasturtium'], foes: ['potato'] },
  strawberry: { friends: ['lettuce', 'spinach', 'borage', 'onion'], foes: ['cabbage'] },
  onion:      { friends: ['carrot', 'lettuce', 'beet', 'strawberry'], foes: ['beans', 'peas'] },
  garlic:     { friends: ['tomato', 'rose', 'raspberry', 'carrot'], foes: ['beans', 'peas'] },
  pea:        { friends: ['carrot', 'corn', 'cucumber', 'beans'], foes: ['onion', 'garlic'] },
  radish:     { friends: ['peas', 'lettuce', 'cucumber', 'carrot'], foes: ['hyssop'] },
  spinach:    { friends: ['strawberry', 'peas', 'beans', 'cauliflower'], foes: [] },
  marigold:   { friends: ['tomato', 'potato', 'squash', 'cucumber'], foes: [] },
  sunflower:  { friends: ['cucumber', 'corn', 'beans'], foes: ['potato'] },
};

// ─── Planting Calendar (zone-aware) ──────────────────────────────────────────

const CALENDAR_DATA: CalendarEntry[] = [
  // Spring starts
  { month: 1,  plantName: 'onion',      action: 'start_indoor',  zone: '5-7', notes: 'Start seeds indoors 8-10 weeks before last frost' },
  { month: 1,  plantName: 'pepper',     action: 'start_indoor',  zone: '5-7', notes: 'Needs heat mat, 70-80F soil' },
  { month: 2,  plantName: 'tomato',     action: 'start_indoor',  zone: '5-7', notes: 'Start 6-8 weeks before last frost' },
  { month: 2,  plantName: 'lettuce',    action: 'start_indoor',  zone: '5-7', notes: 'Can direct sow in warmer zones' },
  { month: 3,  plantName: 'basil',      action: 'start_indoor',  zone: '5-7', notes: 'Sensitive to cold' },
  { month: 3,  plantName: 'pea',        action: 'direct_sow',    zone: '5-7', notes: 'As soon as soil is workable' },
  { month: 3,  plantName: 'spinach',    action: 'direct_sow',    zone: '5-7', notes: 'Cool weather crop' },
  { month: 3,  plantName: 'radish',     action: 'direct_sow',    zone: '5-7', notes: 'Quick crop, 25 days to harvest' },
  { month: 4,  plantName: 'carrot',     action: 'direct_sow',    zone: '5-7', notes: 'Sow when soil is 50F+' },
  { month: 4,  plantName: 'lettuce',    action: 'direct_sow',    zone: '5-7', notes: 'Succession sow every 2 weeks' },
  { month: 4,  plantName: 'potato',     action: 'direct_sow',    zone: '5-7', notes: 'Plant seed potatoes 2 weeks before last frost' },
  { month: 5,  plantName: 'tomato',     action: 'transplant',    zone: '5-7', notes: 'Harden off before planting out' },
  { month: 5,  plantName: 'pepper',     action: 'transplant',    zone: '5-7', notes: 'Wait until nights are 55F+' },
  { month: 5,  plantName: 'cucumber',   action: 'direct_sow',    zone: '5-7', notes: 'Soil must be 60F+, sensitive to cold' },
  { month: 5,  plantName: 'squash',     action: 'direct_sow',    zone: '5-7', notes: 'Sow after last frost' },
  { month: 5,  plantName: 'beans',      action: 'direct_sow',    zone: '5-7', notes: 'Soil 60F+, don't soak before planting' },
  { month: 5,  plantName: 'basil',      action: 'transplant',    zone: '5-7', notes: 'Night temps 50F+' },
  { month: 5,  plantName: 'corn',       action: 'direct_sow',    zone: '5-7', notes: 'Plant in blocks for pollination' },
  { month: 6,  plantName: 'strawberry', action: 'harvest_window', zone: '5-7', notes: 'June-bearing varieties peak' },
  { month: 6,  plantName: 'lettuce',    action: 'harvest_window', zone: '5-7', notes: 'Harvest before bolting in heat' },
  { month: 7,  plantName: 'tomato',     action: 'harvest_window', zone: '5-7', notes: 'Pick when color is full' },
  { month: 7,  plantName: 'cucumber',   action: 'harvest_window', zone: '5-7', notes: 'Pick frequently to encourage production' },
  { month: 7,  plantName: 'squash',     action: 'harvest_window', zone: '5-7', notes: 'Harvest summer squash small' },
  { month: 8,  plantName: 'pepper',     action: 'harvest_window', zone: '5-7', notes: 'Green or wait for color' },
  { month: 8,  plantName: 'carrot',     action: 'harvest_window', zone: '5-7', notes: 'Sweetens after light frost' },
  { month: 8,  plantName: 'beans',      action: 'harvest_window', zone: '5-7', notes: 'Pick regularly' },
  { month: 9,  plantName: 'potato',     action: 'harvest_window', zone: '5-7', notes: 'Harvest after vines die back' },
  { month: 9,  plantName: 'onion',      action: 'harvest_window', zone: '5-7', notes: 'When tops fall over and dry' },
  { month: 9,  plantName: 'radish',     action: 'direct_sow',    zone: '5-7', notes: 'Fall crop' },
  { month: 9,  plantName: 'spinach',    action: 'direct_sow',    zone: '5-7', notes: 'Fall crop, protect from frost' },
  { month: 10, plantName: 'garlic',     action: 'direct_sow',    zone: '5-7', notes: 'Plant before ground freezes' },
  // Warmer zones (8-10) — earlier starts
  { month: 1,  plantName: 'tomato',     action: 'start_indoor',  zone: '8-10', notes: 'Start seeds early for long season' },
  { month: 2,  plantName: 'pepper',     action: 'start_indoor',  zone: '8-10', notes: 'Indoors 8-10 weeks before transplant' },
  { month: 2,  plantName: 'lettuce',    action: 'direct_sow',    zone: '8-10', notes: 'Cool season window' },
  { month: 2,  plantName: 'pea',        action: 'direct_sow',    zone: '8-10', notes: 'Plant early, heat comes fast' },
  { month: 3,  plantName: 'tomato',     action: 'transplant',    zone: '8-10', notes: 'Last frost passed' },
  { month: 3,  plantName: 'cucumber',   action: 'direct_sow',    zone: '8-10', notes: 'Warm soil ready' },
  { month: 3,  plantName: 'squash',     action: 'direct_sow',    zone: '8-10', notes: 'Direct sow after frost' },
  { month: 4,  plantName: 'beans',      action: 'direct_sow',    zone: '8-10', notes: 'Soil is warm' },
  { month: 4,  plantName: 'corn',       action: 'direct_sow',    zone: '8-10', notes: 'Plant in blocks' },
  { month: 5,  plantName: 'tomato',     action: 'harvest_window', zone: '8-10', notes: 'Early harvests begin' },
  { month: 6,  plantName: 'pepper',     action: 'harvest_window', zone: '8-10', notes: 'Peak production' },
  { month: 7,  plantName: 'cucumber',   action: 'harvest_window', zone: '8-10', notes: 'Continuous harvest' },
  { month: 9,  plantName: 'lettuce',    action: 'direct_sow',    zone: '8-10', notes: 'Fall planting' },
  { month: 10, plantName: 'garlic',     action: 'direct_sow',    zone: '8-10', notes: 'Fall planted for next year' },
  { month: 10, plantName: 'spinach',    action: 'direct_sow',    zone: '8-10', notes: 'Fall/winter crop' },
  { month: 11, plantName: 'strawberry', action: 'transplant',    zone: '8-10', notes: 'Fall planting for spring harvest' },
];

// ─── Exported Functions ──────────────────────────────────────────────────────

export function getCompanions(plantName: string): { friends: string[]; foes: string[] } {
  const key = plantName.toLowerCase().trim();
  return COMPANION_DB[key] ?? { friends: [], foes: [] };
}

export function getCalendarForMonth(month: number, zone?: string): CalendarEntry[] {
  return CALENDAR_DATA.filter(e => {
    if (e.month !== month) return false;
    if (zone && !e.zone.includes(zone.replace(/[^0-9]/g, '').charAt(0))) return false;
    return true;
  });
}

export function getCalendarForPlant(plantName: string): CalendarEntry[] {
  return CALENDAR_DATA.filter(e => e.plantName === plantName.toLowerCase().trim());
}

export function getFullCalendar(): CalendarEntry[] {
  return [...CALENDAR_DATA];
}

export function getPlantStage(plantedDate: string, typicalDaysToHarvest: number): PlantProfile['stage'] {
  const planted = new Date(plantedDate);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24));
  const pct = daysSince / typicalDaysToHarvest;

  if (pct < 0.05) return 'seed';
  if (pct < 0.15) return 'sprout';
  if (pct < 0.45) return 'vegetative';
  if (pct < 0.65) return 'flowering';
  if (pct < 0.95) return 'fruiting';
  if (pct < 1.3) return 'harvested';
  return 'dormant';
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function getCurrentSeason(): string {
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  if (month >= 2 && month <= 4) return `Spring ${year}`;
  if (month >= 5 && month <= 7) return `Summer ${year}`;
  if (month >= 8 && month <= 10) return `Fall ${year}`;
  return `Winter ${year}`;
}
