// Pure rules that turn the admin-controlled public configuration into what the visitor sees (no React, no network: unit-tested in scripts/test-play-zone-client.mjs).

/** The lobby list: hidden or unpublished games are left out, then ordered, with the admin's title and description. A game that is switched off still shows, labelled. */
export function applyConfig(games, cfg) {
  if (!cfg) return games
  const by = Object.fromEntries(cfg.games.map((g) => [g.slug, g]))
  return games.filter((g) => { const c = by[g.slug]; return !c || (c.published && c.visibility === 'public') })
    .map((g) => { const c = by[g.slug]; return c ? { ...g, title: c.title || g.title, tagline: c.short_description || g.tagline, adminConfig: c, thumbnailUrl: c.thumbnail_url, bannerUrl: c.banner_url } : g })
    .sort((a, b) => (by[a.slug]?.sort_order ?? 99) - (by[b.slug]?.sort_order ?? 99))
    .sort((a, b) => Number(!!by[b.slug]?.featured) - Number(!!by[a.slug]?.featured))
}

/** Why a game cannot be played right now, or null when it can. */
export function unavailableReason(cfg, slug) {
  if (!cfg) return null
  const c = cfg.games.find((g) => g.slug === slug)
  if (!cfg.enabled) return 'The Play Zone is closed at the moment.'
  if (cfg.maintenance) return cfg.maintenance_message || 'The Play Zone is under maintenance. Please try again soon.'
  if (c && (!c.enabled || !c.published)) return 'This game is not available right now.'
  if (c?.maintenance) return 'This game is under maintenance. Please try again soon.'
  return null
}
