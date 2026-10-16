(() => {
  if (typeof App === 'undefined') return;

  const addUnique = (list, url) => {
    if (url && !list.includes(url)) list.push(url);
  };
  const enkaImage = (name) => name ? ENKA_UI + String(name) + '.png' : '';

  App.charImage = function charImage(c, portrait = false) {
    const asset = c?.asset || {};
    const data = c?.data || {};
    const side = asset.SideIconName || asset.sideIconName || '';
    const costumeId = data.costumeId ?? data.costume_id;
    const costumes = asset.Costumes || asset.costumes || {};
    const costume = costumeId != null ? (costumes[String(costumeId)] || costumes[costumeId]) : null;
    const slug = this.devSlug(c);
    const urls = [];

    if (portrait) {
      addUnique(urls, enkaImage(costume?.art));
      if (slug) addUnique(urls, GENSHIN_DEV + '/characters/' + encodeURIComponent(slug) + '/portrait');
    } else {
      addUnique(urls, enkaImage(costume?.icon));
      addUnique(urls, enkaImage(costume?.sideIconName));
    }

    if (side) {
      const normalIcon = String(side).replace(/^UI_AvatarIcon_Side_/, 'UI_AvatarIcon_');
      addUnique(urls, enkaImage(normalIcon));
      // SideIconName is supplied by Enka's character metadata, so keep the exact
      // asset as a fallback instead of assuming the normal icon always exists.
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
