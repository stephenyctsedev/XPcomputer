// Pure transform: GBC_Portfolio/data.js source text -> XPcomputer portfolio records.
// No file IO here, so the whole transform is testable without a GBC checkout.

/**
 * Curated slug and Explorer folder name per GBC asset folder. The nine real projects are a
 * fixed set, and folder names like `jqvdm20` do not read well in a file path or a window.
 * Anything not listed falls back to the mechanical rules below.
 */
export const PROJECT_META = {
  coin_pusher: { slug: 'coin-pusher', folder: 'Coin Pusher' },
  emoji: { slug: 'megabox-emoji', folder: 'MEGABOX × EMOJI' },
  beer_pushing_game: { slug: 'beer-happy-challenge', folder: 'Beer Happy Challenge' },
  monster_inc: { slug: 'monster-inc-cityplaza', folder: 'Monster Inc × CityPlaza' },
  nat_geo: { slug: 'nat-geo-rac-club', folder: 'Nat Geo Kids RAC Club' },
  bt21: { slug: 'bt21-extensive-reading', folder: 'Extensive Reading BT21' },
  jqvdm20: { slug: 'jurlique-catching-game', folder: 'Jurlique Catching Game' },
  hrkr19: { slug: 'helena-rubinstein-booth', folder: 'Helena Rubinstein Booth' },
  dior: { slug: 'dior-lip-glow', folder: 'Dior Lip Glow' },
};

const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov']);
const FORBIDDEN = /[\\/:*?"<>|]/g;

export function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function sanitizeFolderName(name, max = 32) {
  const clean = String(name).replace(FORBIDDEN, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const sliced = clean.slice(0, max);
  const lastSpace = sliced.lastIndexOf(' ');
  const cut = lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced;
  return cut.replace(/[\s-]+$/, '');
}

export function assetFolder(photoPath) {
  const parts = String(photoPath).split('/');
  return parts.length >= 2 ? parts[parts.length - 2] : '';
}

export function mediaKind(file) {
  const dot = String(file).lastIndexOf('.');
  return dot >= 0 && VIDEO_EXT.has(String(file).slice(dot).toLowerCase()) ? 'video' : 'image';
}

export function outputName(file, kind) {
  if (kind === 'video') return file;
  const dot = String(file).lastIndexOf('.');
  return `${dot >= 0 ? String(file).slice(0, dot) : file}.jpg`;
}

/**
 * Evaluate the GBC data.js source. It is a plain `const DATA = {...}` script with no imports,
 * and it is a trusted file in a sibling repo we own, not user input.
 */
export function parseData(source) {
  const data = new Function(`${source}\n;return typeof DATA === 'undefined' ? null : DATA;`)();
  if (!data || !Array.isArray(data.projects)) throw new Error('data.js did not define DATA.projects');
  return data;
}

export function buildPortfolio(source, { sourceRef = 'unknown', updated } = {}) {
  const data = parseData(source);
  const projects = data.projects.map((project) => {
    if (!Array.isArray(project.photos) || project.photos.length === 0) {
      throw new Error(`project ${project.id} has no photos`);
    }
    const key = assetFolder(project.photos[0]);
    const meta = PROJECT_META[key] ?? { slug: slugify(key), folder: sanitizeFolderName(project.name) };
    const media = project.photos.map((photo) => {
      const file = photo.split('/').pop();
      const kind = mediaKind(file);
      const out = outputName(file, kind);
      return {
        source: photo,
        file: out,
        kind,
        src: `portfolio/${meta.slug}/${out}`,
        thumb: kind === 'video' ? null : `portfolio/${meta.slug}/thumbs/${outputName(file, 'image')}`,
      };
    });
    return {
      slug: meta.slug,
      folder: meta.folder,
      name: project.name,
      category: project.category,
      tagline: project.tagline,
      description: project.description,
      tech: [...(project.tech ?? [])],
      media,
    };
  });

  const slugs = projects.map((p) => p.slug);
  const duplicate = slugs.find((slug, i) => slugs.indexOf(slug) !== i);
  if (duplicate) throw new Error(`duplicate slug ${duplicate}`);

  return { projects, source: sourceRef, updated: updated ?? new Date().toISOString().slice(0, 10) };
}
