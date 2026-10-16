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

  // New characters may reach the profile API before third-party metadata files
  // are updated. These UI suffixes are enough to load the canonical Enka assets.
  const NEW_CHARACTER_ASSETS = {
    '10000125': 'Columbina',
    '10000126': 'Zibai',
    '10000130': 'Linnea'
  };

  App.charImage = function charImage(c, portrait = false) {
    const asset = c?.asset || {};
    const external = asset.ExternalImages || asset.externalImages || {};
    const data = c?.data || {};
    const id = String(c?.id ?? data?.avatarId ?? data?.avatar_id ?? '');
    const suffix = NEW_CHARACTER_ASSETS[id] || '';
    const side = assetName(asset.SideIconName || asset.sideIconName || (suffix ? 'UI_AvatarIcon_Side_' + suffix : ''));
    const costumeId = data.costumeId ?? data.costume_id;
    const costumes = asset.Costumes || asset.costumes || {};
    const costume = costumeId != null ? (costumes[String(costumeId)] || costumes[costumeId]) : null;
    const slug = this.devSlug({ ...c, asset: { ...asset, SideIconName: side } });
    const urls = [];

    if (portrait) {
      addUnique(urls, external.portrait);
      addUnique(urls, enkaImage(costume?.art || costume?.Art));
      if (side) {
        addUnique(urls, enkaImage(side.replace(/^UI_AvatarIcon_Side_/, 'UI_AvatarIcon_')));
        addUnique(urls, enkaImage(side));
      }
      if (slug) addUnique(urls, GENSHIN_DEV + '/characters/' + encodeURIComponent(slug) + '/portrait');
      addUnique(urls, external.icon);
      addUnique(urls, external.side);
    } else {
      addUnique(urls, external.icon);
      addUnique(urls, enkaImage(costume?.icon || costume?.Icon));
      addUnique(urls, enkaImage(costume?.sideIconName || costume?.SideIcon || costume?.SideIconName));
      addUnique(urls, external.side);
      if (side) {
        addUnique(urls, enkaImage(side.replace(/^UI_AvatarIcon_Side_/, 'UI_AvatarIcon_')));
        addUnique(urls, enkaImage(side));
      }
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
