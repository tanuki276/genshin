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
    .slice(0, 200);

  if (!hashes.length) return res.status(400).json({ error: 'hashesをカンマ区切りで指定してください' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/loc.json',
      { headers: { Accept: 'application/json' }, signal: controller.signal }
    );
    if (!response.ok) throw new Error('Enka localization HTTP ' + response.status);

    const loc = await response.json();
    const ja = {};
    for (const hash of hashes) {
      if (loc?.ja?.[hash]) ja[hash] = loc.ja[hash];
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json({ locJa: ja });
  } catch (e) {
    if (e?.name === 'AbortError') return res.status(504).json({ error: 'ローカライズデータの取得がタイムアウトしました' });
    return res.status(502).json({ error: e?.message || 'ローカライズデータを取得できませんでした' });
  } finally {
    clearTimeout(timer);
  }
}
