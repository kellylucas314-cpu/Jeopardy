/**
 * The 13 player characters (public/assets/players/manifest.json).
 * Paths resolve against the manifest's own folder through the page's base URL,
 * so they work locally and under /Jeopardy/ on GitHub Pages.
 */

const MANIFEST_URL = new URL('assets/players/manifest.json', document.baseURI);
let roster = [];
let byId = new Map();
let loading = null;

export function loadCharacters() {
  if (!loading) {
    loading = fetch(MANIFEST_URL)
      .then(r => (r.ok ? r.json() : { characters: [] }))
      .then(m => {
        roster = (m.characters || []).map(c => ({
          ...c,
          portraitUrl: new URL(c.portrait, MANIFEST_URL).href,
          poseUrls: Object.fromEntries(
            Object.entries(c.poses || {}).map(([k, v]) => [k, new URL(v, MANIFEST_URL).href]),
          ),
        }));
        byId = new Map(roster.map(c => [c.id, c]));
        return roster;
      })
      .catch(() => roster);
  }
  return loading;
}

export function characters() { return roster; }

/** The character for an id, or null for no pick, an old save, or a missing file. */
export function characterById(id) { return (id && byId.get(id)) || null; }

export function portraitUrl(id) {
  const c = characterById(id);
  return c ? c.portraitUrl : null;
}

export function poseUrl(id, pose) {
  const c = characterById(id);
  return (c && c.poseUrls[pose]) || null;
}
