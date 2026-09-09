export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const uid = String(req.query?.uid || '').trim();
  if (!/^\d{8,10}$/.test(uid)) {
    return res.status(400).json({ error: 'UID must be 8-10 digits' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`https://enka.network/api/uid/${encodeURIComponent(uid)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Genshin-UID-Analyzer/1.0'
      },
      signal: controller.signal
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text || 'Invalid response from Enka.Network' }; }

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    return res.status(response.status).json(data);
  } catch (error) {
    if (error?.name === 'AbortError') return res.status(504).json({ error: 'Enka.Network request timed out' });
    return res.status(502).json({ error: 'Failed to reach Enka.Network', detail: error?.message || 'Unknown error' });
  } finally {
    clearTimeout(timeout);
  }
}
