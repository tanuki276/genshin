export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const uid = String(req.query?.uid || '').trim();
  if (!/^\d{8,10}$/.test(uid)) return res.status(400).json({ error: 'UIDは8〜10桁の数字で指定してください' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const upstream = await fetch(`https://enka.network/api/uid/${uid}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Genshin-UID-Analyzer/1.0'
      },
      signal: controller.signal
    });
    const text = await upstream.text();
    let body;
    try { body = JSON.parse(text); }
    catch { body = { error: text || 'Enka.Networkから不正な応答が返されました' }; }
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    return res.status(upstream.status).json(body);
  } catch (e) {
    if (e?.name === 'AbortError') return res.status(504).json({ error: 'Enka.Networkへの接続がタイムアウトしました' });
    return res.status(502).json({ error: 'Enka.Networkへ接続できませんでした', detail: e?.message || 'Unknown error' });
  } finally {
    clearTimeout(timer);
  }
}
