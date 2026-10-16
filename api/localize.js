const TEXT_MAP_JA_URL = 'https://raw.githubusercontent.com/seriaati/enka-py-assets/main/data/text_map_ja.json';
const ENKA_GI_LOCS_URL = 'https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/gi/locs.json';
const ENKA_LEGACY_LOC_URL = 'https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/loc.json';

async function fetchJson(url, signal) {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    return null;
  }
}

function japaneseMap(source) {
  if (!source || typeof source !== 'object') return {};
  for (const key of ['ja', 'jp', 'ja-jp', 'ja_jp', 'JA', 'JP']) {
    if (source[key] && typeof source[key] === 'object') return source[key];
  }
  return {};
}

function translatedValue(map, hash) {
  const raw = map?.[hash];
  if (raw == null) return '';
  const value = String(raw).trim();
  // Some upstream localization tables keep a numeric placeholder for entries
  // they do not know yet. Do not treat that as a successful translation.
  if (!value || value === String(hash)) return '';
  return value;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const hashes = [...new Set(String(req.query?.hashes || '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => /^\d+$/.test(x)))]
    .slice(0, 300);

  if (!hashes.length) return res.status(400).json({ error: 'hashesをカンマ区切りで指定してください' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    // Enka's current Genshin data lives under store/gi. Keep the legacy store
    // and the independent text map as fallbacks so both old and newly released
    // weapons/artifact sets continue to resolve while upstream sources update.
    const [currentMap, giLocs, legacyLoc] = await Promise.all([
      fetchJson(TEXT_MAP_JA_URL, controller.signal),
      fetchJson(ENKA_GI_LOCS_URL, controller.signal),
      fetchJson(ENKA_LEGACY_LOC_URL, controller.signal)
    ]);

    if (!currentMap && !giLocs && !legacyLoc) {
      throw new Error('Japanese localization sources unavailable');
    }

    const giJa = japaneseMap(giLocs);
    const legacyJa = japaneseMap(legacyLoc);
    const locJa = {};
    const missing = [];

    for (const hash of hashes) {
      const value = translatedValue(giJa, hash)
        || translatedValue(currentMap, hash)
        || translatedValue(legacyJa, hash);
      if (value) locJa[hash] = value;
      else missing.push(hash);
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    return res.status(200).json({ locJa, missing });
  } catch (e) {
    if (e?.name === 'AbortError') return res.status(504).json({ error: 'ローカライズデータの取得がタイムアウトしました' });
    return res.status(502).json({ error: e?.message || 'ローカライズデータを取得できませんでした' });
  } finally {
    clearTimeout(timer);
  }
}
