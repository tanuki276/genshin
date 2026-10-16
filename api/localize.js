const TEXT_MAP_JA_URL = 'https://raw.githubusercontent.com/seriaati/enka-py-assets/main/data/text_map_ja.json';
const ENKA_LOC_URL = 'https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/loc.json';

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
    // Profile equipment hashes originate from Enka, so prefer Enka's matching
    // localization table. The current text map is kept as a fallback because
    // newer equipment can appear there before Enka's store catches up.
    const [currentMap, enkaLoc] = await Promise.all([
      fetchJson(TEXT_MAP_JA_URL, controller.signal),
      fetchJson(ENKA_LOC_URL, controller.signal)
    ]);

    if (!currentMap && !enkaLoc) throw new Error('Japanese localization sources unavailable');

    const enkaJa = enkaLoc?.ja || enkaLoc?.jp || enkaLoc?.JA || {};
    const locJa = {};
    const missing = [];
    for (const hash of hashes) {
      const value = enkaJa?.[hash] || currentMap?.[hash];
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
