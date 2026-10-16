(() => {
  if (typeof App === 'undefined') return;

  const addUnique = (list, url) => {
    if (url && !list.includes(url)) list.push(url);
  };
  const assetName = (value) => String(value || '')
    .trim()
    .replace(/^https?:\/\/[^/]+\/ui\//i, '')
    .replace(/^\/?ui\//i, '')
    .replace(/\.(?:png|jpe?g|webp)$/i, '');
  const enkaImage = (name) => {
    const n = assetName(name);
    return n ? ENKA_UI + n + '.png' : '';
  };

  App.charImage = function charImage(c, portrait = false) {
    const asset = c?.asset || {};
    const external = asset.ExternalImages || asset.externalImages || {};
    const data = c?.data || {};
    const side = assetName(asset.SideIconName || asset.sideIconName || '');
    const costumeId = data.costumeId ?? data.costume_id;
    const costumes = asset.Costumes || asset.costumes || {};
    const costume = costumeId != null ? (costumes[String(costumeId)] || costumes[costumeId]) : null;
    const slug = this.devSlug(c);
    const urls = [];

    if (portrait) {
      addUnique(urls, external.portrait);
      addUnique(urls, enkaImage(costume?.art || costume?.Art));
      if (slug) addUnique(urls, GENSHIN_DEV + '/characters/' + encodeURIComponent(slug) + '/portrait');
      addUnique(urls, external.icon);
      addUnique(urls, external.side);
    } else {
      addUnique(urls, external.icon);
      addUnique(urls, enkaImage(costume?.icon || costume?.Icon));
      addUnique(urls, enkaImage(costume?.sideIconName || costume?.SideIcon || costume?.SideIconName));
      addUnique(urls, external.side);
    }

    if (side) {
      const normalIcon = side.replace(/^UI_AvatarIcon_Side_/, 'UI_AvatarIcon_');
      addUnique(urls, enkaImage(normalIcon));
      addUnique(urls, enkaImage(side));
    }

    if (!portrait && slug) {
      addUnique(urls, GENSHIN_DEV + '/characters/' + encodeURIComponent(slug) + '/icon');
    }

    const oldSlug = this.assetSlug(side);
    if (oldSlug) {
      addUnique(urls, ASSET_ROOT + '/' + (portrait ? 'CharacterPortrait/' : 'CharacterIcon/') + oldSlug + (portrait ? '.png' : '_icon.png'));
    }

    return { src: urls[0] || '', fallbacks: urls.slice(1) };
  };
})();
