export function sourceKey(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('HTTPS source required');
  return url.hostname.replace(/^www\./, '').toLowerCase() + url.pathname.replace(/\/+$/, '');
}

// The lead, supporting stories, and additional headlines each get a distinct source.
export function additionalSources(stories, representedUrls) {
  const seen = new Set(representedUrls.map(sourceKey));
  return stories.filter(story => {
    try {
      const key = sourceKey(story.url);
      if (seen.has(key) || !['power','market','ai','network'].includes(story.category) ||
          typeof story.title !== 'string' || story.title.length > 210 ||
          typeof story.source !== 'string' || story.source.length > 90 ||
          !/^\d{4}-\d{2}-\d{2}$/.test(story.published)) return false;
      seen.add(key);
      return true;
    } catch { return false; }
  }).slice(0, 6);
}
