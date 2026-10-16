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

  App.normalizedElement = function normalizedElement(value) {
    return ELEMENT_ALIASES[String(value || '')] || String(value || '');
  };

  App.getElement = function getElement(c) {
    const id = String(c.avatarId ?? c.avatar_id ?? c.id);
    const asset = this.assetFor(id);
    const key = this.normalizedElement(asset.Element || asset.element);
    return ELEMENT_LABELS[key] || '？？？';
  };

  App.elementImage = function elementImage(c) {
    const a = this.assetFor(c.id);
    const key = this.normalizedElement(a.Element || a.element);
    const file = ELEMENT_FILES[key];
    return file ? ASSET_ROOT + '/Elements/' + file : '';
  };

  App.localizedHash = function localizedHash(hash, fallback = '-') {
    const key = hash == null ? '' : String(hash);
    return (key && this.locJa?.[key]) || fallback;
  };

  App.artifactData = function artifactData(c) {
    const arr = [];
    for (const q of c.equipList || []) {
      const f = q.flat || {};
      if (f.itemType === 'ITEM_RELIQUARY' || f.reliquaryMainstat || f.reliquarySubstats) {
        const main = f.reliquaryMainstat || {}, subs = f.reliquarySubstats || [];
        const setHash = f.setNameTextMapHash;
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
        const nameHash = f.nameTextMapHash;
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
        for (const value of [f.setNameTextMapHash, f.nameTextMapHash]) {
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
