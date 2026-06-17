import { put, list } from '@vercel/blob';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const BLOB_PATHNAME = 'mkcompras-analytics.json';
const __dir = dirname(fileURLToPath(import.meta.url));

const STOP_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'para', 'com', 'em', 'um', 'uma',
  'os', 'as', 'e', 'a', 'o', 'que', 'se', 'na', 'no', 'nos', 'nas',
  'por', 'ate', 'mais', 'mas', 'ou', 'seu', 'sua', 'ao', 'aos', 'the',
  'and', 'or', 'of', 'in', 'for', 'to', 'an', 'cm', 'mm', 'ml', 'gb',
  'tb', 'mb', 'kg', 'un', 'pcs', 'kit', 'com', 'sem', 'novo', 'nova',
]);

async function readAnalytics() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: BLOB_PATHNAME });
      const blob = blobs.find((b) => b.pathname === BLOB_PATHNAME);
      if (blob) {
        const res = await fetch(blob.url);
        return await res.json();
      }
    } catch (e) {
      console.error('Analytics blob read error:', e.message);
    }
  }

  try {
    const filePath = join(__dir, '../../../data/analytics.json');
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return { events: [] };
  }
}

async function writeAnalytics(data) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(BLOB_PATHNAME, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
    });
    return;
  }

  try {
    const filePath = join(__dir, '../../../data/analytics.json');
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Analytics local write error:', e.message);
  }
}

export async function recordEvent(event) {
  try {
    const analytics = await readAnalytics();
    if (!Array.isArray(analytics.events)) analytics.events = [];
    analytics.events.push({
      id: randomUUID(),
      ...event,
      timestamp: new Date().toISOString(),
    });
    await writeAnalytics(analytics);
  } catch (e) {
    console.error('recordEvent error:', e.message);
  }
}

export function extractTags(name = '', description = '') {
  const text = `${name} ${description}`.toLowerCase();
  const words = text
    .replace(/[^a-záàãâéêíóôõúüçñ0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

  return [...new Set(words)].slice(0, 10);
}

export async function getAnalyticsSummary() {
  const analytics = await readAnalytics();
  const events = analytics.events || [];

  const platforms = {};
  const categories = {};
  const tagsCount = {};
  const byDay = {};

  for (const e of events) {
    if (e.platform) platforms[e.platform] = (platforms[e.platform] || 0) + 1;
    if (e.category) categories[e.category] = (categories[e.category] || 0) + 1;
    if (Array.isArray(e.tags)) {
      for (const tag of e.tags) {
        tagsCount[tag] = (tagsCount[tag] || 0) + 1;
      }
    }
    if (e.timestamp) {
      const day = e.timestamp.slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    }
  }

  const platformStats = Object.entries(platforms)
    .sort((a, b) => b[1] - a[1])
    .map(([platform, count]) => ({ platform, count }));

  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  const topTags = Object.entries(tagsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));

  const timeline = Object.entries(byDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, count]) => ({ date, count }));

  return {
    total: events.length,
    linkConversions: events.filter((e) => e.type === 'link_converted').length,
    productAdditions: events.filter((e) => e.type === 'product_added').length,
    platformStats,
    topCategories,
    topTags,
    timeline,
  };
}
