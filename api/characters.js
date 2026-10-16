const CHARACTER_DATA_URL = 'https://raw.githubusercontent.com/seriaati/enka-py-assets/main/data/characters.json';
const TEXT_MAP_JA_URL = 'https://raw.githubusercontent.com/seriaati/enka-py-assets/main/data/text_map_ja.json';
const CHARACTER_IMAGES_URL = 'https://raw.githubusercontent.com/theBowja/genshin-db/main/src/data/image/characters.json';

const assetName = (value) => String(value || '')
  .trim()
  .replace(/^https?:\/\/[^/]+\/ui\//i, '')
  .replace(/^\/?ui\//i, '')
  .replace(/\.(?:png|jpe?g|webp)$/i, '');

function normalizeCostumes(costumes) {
  const out = {};
  for (const [id, row] of Object.entries(costumes || {})) {
    out[id] = {
      ...row,
      art: assetName(row?.Art || row?.art),
      icon: assetName(row?.Icon || row?.icon),
      sideIconName: assetName(row?.SideIcon || row?.SideIconName || row?.sideIconName)
    };
  }
  return out;
}

function normalizeCharacter(row, imageRows) {
  const sideIconName = assetName(row?.SideIconName || row?.sideIconName);
  const image = sideIconName
    ? imageRows.find((entry) => assetName(entry?.filename_sideIcon) === sideIconName)
    : null;

  return {
    ...row,
    SideIconName: sideIconName,
    Costumes: normalizeCostumes(row?.Costumes || row?.costumes),
    ExternalImages: image ? {
      icon: image.hoyowiki_icon || image.mihoyo_icon || image.image || '',
      side: image.mihoyo_sideIcon || '',
      portrait: image.portrait || image.card || image.hoyowiki_icon || image.mihoyo_icon || image.image || ''
    } : {}
  };
}

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
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const imagesPromise = fetch(CHARACTER_IMAGES_URL, {
      headers: { Accept: 'application/json' }, signal: controller.signal
    }).then((r) => r.ok ? r.json() : {}).catch(() => ({}));

    const [charactersResponse, locResponse, imageDb] = await Promise.all([
      fetch(CHARACTER_DATA_URL, { headers: { Accept: 'application/json' }, signal: controller.signal }),
      fetch(TEXT_MAP_JA_URL, { headers: { Accept: 'application/json' }, signal: controller.signal }),
      imagesPromise
    ]);

    if (!charactersResponse.ok) throw new Error('Character mapping HTTP ' + charactersResponse.status);
    if (!locResponse.ok) throw new Error('Japanese localization HTTP ' + locResponse.status);

    const [characters, locJaAll] = await Promise.all([
      charactersResponse.json(),
      locResponse.json()
    ]);
    const imageRows = Object.values(imageDb || {});
    const selected = {};
    const hashes = new Set();

    for (const id of ids) {
      const row = characters[String(id)];
      if (!row) continue;
      const normalized = normalizeCharacter(row, imageRows);
      selected[String(id)] = normalized;
      if (normalized.NameTextMapHash != null) hashes.add(String(normalized.NameTextMapHash));
    }

    const locJa = {};
    for (const hash of hashes) {
      if (locJaAll?.[hash]) locJa[hash] = locJaAll[hash];
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    return res.status(200).json({
      enkaCharacters: selected,
      locJa,
      genshinDevBase: 'https://genshin.jmp.blue'
    });
  } catch (e) {
    if (e?.name === 'AbortError') return res.status(504).json({ error: 'キャラクターデータの取得がタイムアウトしました' });
    return res.status(502).json({ error: e?.message || 'キャラクターデータを取得できませんでした' });
  } finally {
    clearTimeout(timer);
  }
}
