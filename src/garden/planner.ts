/**
 * Garden Planner — beds, zones, rotations, succession planting, soil health.
 *
 * Pure data layer consumed by the worker. Zero deps.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GardenBed {
  id: string;
  name: string;
  width: number;             // feet
  length: number;            // feet
  location: 'full_sun' | 'partial_sun' | 'shade' | 'greenhouse' | 'container';
  plants: BedPlant[];
}

export interface BedPlant {
  plantId: string;
  name: string;
  row?: number;
  column?: number;
  plantedDate: string;
  notes: string;
}

export interface SeasonalPlan {
  season: string;            // e.g. "Spring 2026"
  zone: string;
  plantings: PlannedPlanting[];
}

export interface PlannedPlanting {
  plantName: string;
  variety?: string;
  method: 'direct_sow' | 'transplant' | 'start_indoor';
  targetDate: string;
  bedId?: string;
  successionInterval?: number; // days between successive plantings
  successionCount?: number;
  notes: string;
}

export interface SuccessionPlan {
  plantName: string;
  intervalDays: number;
  plantings: string[];       // ISO dates
  bedId?: string;
}

export interface SoilAmendment {
  id: string;
  date: string;
  bedId: string;
  type: string;              // e.g. "compost", "lime", "fertilizer", "mulch"
  amount: string;            // e.g. "2 inches", "5 lbs"
  notes: string;
}

export interface SoilReading {
  id: string;
  date: string;
  bedId: string;
  ph?: number;
  nitrogen?: 'low' | 'moderate' | 'high';
  phosphorus?: 'low' | 'moderate' | 'high';
  potassium?: 'low' | 'moderate' | 'high';
  organicMatter?: number;    // percentage
  moisture?: 'dry' | 'moist' | 'wet';
  notes: string;
}

export interface CropRotation {
  bedId: string;
  year: number;
  family: string;            // e.g. "solanaceae", "fabaceae", "brassica", "cucurbit", "allium", "root"
}

// ─── Crop Rotation Guidance ──────────────────────────────────────────────────

const ROTATION_ORDER = [
  'legume',       // beans, peas — fix nitrogen
  'leaf',         // lettuce, spinach — need nitrogen
  'fruit',        // tomato, pepper, squash — need phosphorus
  'root',         // carrot, onion, garlic — need potassium
  'brassica',     // cabbage, broccoli — need nitrogen
];

const PLANT_FAMILIES: Record<string, string> = {
  tomato: 'fruit', pepper: 'fruit', eggplant: 'fruit', potato: 'fruit', squash: 'fruit', cucumber: 'fruit',
  bean: 'legume', pea: 'legume', lentil: 'legume',
  lettuce: 'leaf', spinach: 'leaf', kale: 'brassica', cabbage: 'brassica', broccoli: 'brassica',
  carrot: 'root', onion: 'root', garlic: 'root', radish: 'root', beet: 'root',
  corn: 'grass', sunflower: 'composite', basil: 'herb', marigold: 'composite',
};

// ─── Succession Planting Presets ─────────────────────────────────────────────

const SUCCESSION_PRESETS: Record<string, { intervalDays: number; count: number }> = {
  lettuce:   { intervalDays: 14, count: 4 },
  radish:    { intervalDays: 14, count: 5 },
  spinach:   { intervalDays: 14, count: 3 },
  beans:     { intervalDays: 21, count: 3 },
  carrot:    { intervalDays: 21, count: 3 },
  basil:     { intervalDays: 21, count: 2 },
  cucumber:  { intervalDays: 21, count: 2 },
  corn:      { intervalDays: 14, count: 3 },
  beet:      { intervalDays: 21, count: 3 },
  pea:       { intervalDays: 14, count: 2 },
};

// ─── Soil Recommendations ────────────────────────────────────────────────────

const SOIL_ADVICE: Record<string, string> = {
  low_ph: 'Add lime (calcium carbonate) to raise pH. Wood ash also works slowly. Test again in 4-6 weeks.',
  high_ph: 'Add elemental sulfur or peat moss to lower pH. Pine needles as mulch help slightly.',
  low_nitrogen: 'Add composted manure, blood meal, or plant legumes (beans/peas) as a cover crop.',
  low_phosphorus: 'Add bone meal or rock phosphate. Maintain proper pH (6.0-7.0) for phosphorus availability.',
  low_potassium: 'Add wood ash, kelp meal, or greensand. Banana peels composted into soil also help.',
  low_organic: 'Add 2-3 inches of compost annually. Use mulch to prevent erosion. Plant cover crops in off-season.',
};

// ─── Exported Functions ──────────────────────────────────────────────────────

export function getPlantFamily(plantName: string): string {
  return PLANT_FAMILIES[plantName.toLowerCase().trim()] ?? 'unknown';
}

export function getNextRotation(bedHistory: CropRotation[]): string {
  if (bedHistory.length === 0) return ROTATION_ORDER[0];
  const lastFamily = bedHistory[bedHistory.length - 1]?.family ?? '';
  const idx = ROTATION_ORDER.indexOf(lastFamily);
  return ROTATION_ORDER[(idx + 1) % ROTATION_ORDER.length];
}

export function getRotationOrder(): string[] {
  return [...ROTATION_ORDER];
}

export function getSuccessionPresets(): Record<string, { intervalDays: number; count: number }> {
  return { ...SUCCESSION_PRESETS };
}

export function generateSuccessionDates(
  startDate: string,
  intervalDays: number,
  count: number,
): string[] {
  const start = new Date(startDate);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getTime() + i * intervalDays * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export function getSoilAdvice(reading: SoilReading): string[] {
  const tips: string[] = [];

  if (reading.ph !== undefined && reading.ph < 6.0) tips.push(SOIL_ADVICE.low_ph);
  if (reading.ph !== undefined && reading.ph > 7.5) tips.push(SOIL_ADVICE.high_ph);
  if (reading.nitrogen === 'low') tips.push(SOIL_ADVICE.low_nitrogen);
  if (reading.phosphorus === 'low') tips.push(SOIL_ADVICE.low_phosphorus);
  if (reading.potassium === 'low') tips.push(SOIL_ADVICE.low_potassium);
  if (reading.organicMatter !== undefined && reading.organicMatter < 3) tips.push(SOIL_ADVICE.low_organic);

  return tips;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function getBedArea(bed: GardenBed): number {
  return bed.width * bed.length;
}

export function estimatePlantCapacity(bed: GardenBed, spacingSqFt: number): number {
  return Math.floor(getBedArea(bed) / spacingSqFt);
}
