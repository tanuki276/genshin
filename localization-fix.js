(() => {
  if (typeof App === 'undefined') return;

  const ELEMENT_ALIASES = {
    Fire: 'Fire', Pyro: 'Fire',
    Water: 'Water', Hydro: 'Water',
    Electric: 'Electric', Electro: 'Electric',
    Ice: 'Ice', Cryo: 'Ice',
    Grass: 'Dendro', Dendro: 'Dendro',
    Wind: 'Wind', Anemo: 'Wind',
    Rock: 'Rock', Geo: 'Rock'
  };

  const ELEMENT_LABELS = {
    Fire: '炎', Water: '水', Electric: '雷', Ice: '氷',
    Dendro: '草', Wind: '風', Rock: '岩'
  };

  const ELEMENT_FILES = {
    Fire: 'Element_Pyro.png', Water: 'Element_Hydro.png', Electric: 'Element_Electro.png',
    Ice: 'Element_Cryo.png', Dendro: 'Element_Dendro.png', Wind: 'Element_Anemo.png', Rock: 'Element_Geo.png'
  };

  // Metadata providers sometimes lag behind the live profile API for newly
  // released characters. Keep the known element for those IDs as a fallback.
  const NEW_CHARACTER_ELEMENTS = {
    '10000125': 'Water',   // Columbina
    '10000126': 'Rock',    // Zibai
    '10000130': 'Rock'     // Linnea
  };

  App.normalizedElement = function normalizedElement(value) {
    return ELEMENT_ALIASES[String(value || '')] || String(value || '');
  };

  App.getElement = function getElement(c) {
    const id = String(c.avatarId ?? c.avatar_id ?? c.id);
    const asset = this.assetFor(id);
    const raw = asset.Element || asset.element || NEW_CHARACTER_ELEMENTS[id] || '';
    const key = this.normalizedElement(raw);
    return ELEMENT_LABELS[key] || '？？？';
  };

  App.elementImage = function elementImage(c) {
    const id = String(c?.id ?? c?.data?.avatarId ?? c?.data?.avatar_id ?? '');
    const a = this.assetFor(id);
    const raw = a.Element || a.element || NEW_CHARACTER_ELEMENTS[id] || '';
    const key = this.normalizedElement(raw);
    const file = ELEMENT_FILES[key];
    return file ? ASSET_ROOT + '/Elements/' + file : '';
  };

  App.localizedHash = function localizedHash(hash, fallback = '-') {
    const key = hash == null ? '' : String(hash);
    return (key && this.locJa?.[key]) || fallback;
  };

  const equipmentNameHash = (flat) => flat?.nameTextHashMap ?? flat?.nameTextMapHash;
  const artifactSetHash = (flat) => flat?.setNameTextHashMap ?? flat?.setNameTextMapHash;

  App.artifactData = function artifactData(c) {
    const arr = [];
    for (const q of c.equipList || []) {
      const f = q.flat || {};
      if (f.itemType === 'ITEM_RELIQUARY' || f.reliquaryMainstat || f.reliquarySubstats) {
        const main = f.reliquaryMainstat || {}, subs = f.reliquarySubstats || [];
        const setHash = artifactSetHash(f);
        arr.push({
          slot: this.slot(f, q),
          set: this.localizedHash(setHash, setHash != null ? String(setHash) : 'セット情報不明'),
          level: this.get(q, 'reliquary.level', this.get(q, 'level', 0)),
          rank: f.rankLevel || 0,
          icon: f.icon || '',
          main: this.stat(main.mainPropId || main.appendPropId) + ' ' + this.fmt(main.statValue),
          subs: subs.map(s => this.stat(s.appendPropId) + ' +' + this.fmt(s.statValue)),
          score: this.artifactScore(f),
          raw: q
        });
      }
    }
    return arr;
  };

  App.weaponData = function weaponData(c) {
    const arr = [];
    for (const q of c.equipList || []) {
      const f = q.flat || {};
      if (f.itemType === 'ITEM_WEAPON' || f.weaponStats || q.weapon) {
        const nameHash = equipmentNameHash(f);
        arr.push({
          name: this.localizedHash(nameHash, nameHash != null ? String(nameHash) : '装備武器'),
          level: this.get(q, 'weapon.level', this.get(q, 'level', 0)),
          rank: f.rankLevel || f.rank || 0,
          icon: f.icon || '',
          stats: (f.weaponStats || []).map(s => this.stat(s.appendPropId) + ' ' + this.fmt(s.statValue)),
          raw: q
        });
      }
    }
    return arr;
  };

  App.collectEquipmentHashes = function collectEquipmentHashes(data) {
    const hashes = new Set();
    for (const avatar of data?.avatarInfoList || []) {
      for (const q of avatar.equipList || []) {
        const f = q.flat || {};
        for (const value of [artifactSetHash(f), equipmentNameHash(f)]) {
          if (value != null && /^\d+$/.test(String(value))) hashes.add(String(value));
        }
      }
    }
    return [...hashes];
  };

  const originalRun = App.run.bind(App);
  App.run = async function runWithLocalization(...args) {
    await originalRun(...args);
    if (!this.data) return;

    const hashes = this.collectEquipmentHashes(this.data);
    if (!hashes.length) return;

    try {
      const response = await fetch('/api/localize?hashes=' + encodeURIComponent(hashes.join(',')), { cache: 'no-store' });
      if (!response.ok) return;
      const json = await response.json();
      this.locJa = { ...this.locJa, ...(json.locJa || {}) };
      this.build();
      this.renderAll();
    } catch (_) {
      // Keep the existing numeric fallback if localization is temporarily unavailable.
    }
  };
})();
