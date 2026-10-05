export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const ids = String(req.query?.ids || '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => /^\d{8,10}$/.test(x))
    .slice(0, 200);
  if (!ids.length) return res.status(400).json({ error: 'idsをカンマ区切りで指定してください' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const [charactersResponse, locResponse] = await Promise.all([
      fetch('https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/characters.json', { headers: { Accept: 'application/json' }, signal: controller.signal }),
      fetch('https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/loc.json', { headers: { Accept: 'application/json' }, signal: controller.signal })
    ]);
    if (!charactersResponse.ok) throw new Error('Enka characters mapping HTTP ' + charactersResponse.status);
    if (!locResponse.ok) throw new Error('Enka localization HTTP ' + locResponse.status);
    const [characters, loc] = await Promise.all([charactersResponse.json(), locResponse.json()]);
    const selected = {};
    const hashes = new Set();
    for (const id of ids) {
      const row = characters[String(id)];
      if (row) {
        selected[String(id)] = row;
        if (row.NameTextMapHash != null) hashes.add(String(row.NameTextMapHash));
      }
    }
    const ja = {};
    for (const hash of hashes) if (loc?.ja?.[hash]) ja[hash] = loc.ja[hash];
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json({ enkaCharacters: selected, locJa: ja, genshinDevBase: 'https://genshin.jmp.blue' });
  } catch (e) {
    if (e?.name === 'AbortError') return res.status(504).json({ error: 'キャラクターデータの取得がタイムアウトしました' });
    return res.status(502).json({ error: e?.message || 'キャラクターデータを取得できませんでした' });
  } finally {
    clearTimeout(timer);
  }
}