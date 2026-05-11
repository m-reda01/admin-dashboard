/**
 * Ask Google CDNs for a larger raster than default thumbnails (=s96-c etc.).
 * Actual pixels still cap at whatever Google stored for that account.
 */
const HIGH_EDGE = 2048;

export function profilePhotoHighResUrl(url) {
  const raw = String(url ?? "").trim();
  if (!raw) return "";

  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (!host.includes("googleusercontent.com") && !host.includes("ggpht.com")) {
      return raw;
    }

    let path = u.pathname;
    const wh = path.match(/=w(\d+)-h(\d+)/i);
    if (wh) {
      const w = Number(wh[1]);
      const h = Number(wh[2]);
      if (Math.max(w, h) > 0 && Math.max(w, h) < HIGH_EDGE) {
        path = path.replace(/=w\d+-h\d+/i, `=w${HIGH_EDGE}-h${HIGH_EDGE}`);
      }
    }

    const sm = path.match(/=s(\d+)/i);
    if (sm) {
      const s = Number(sm[1]);
      if (s > 0 && s < HIGH_EDGE) {
        path = path.replace(/=s\d+(?:-[a-z][a-z0-9-]*)*$/i, `=s${HIGH_EDGE}-c`);
        path = path.replace(/=s\d+$/i, `=s${HIGH_EDGE}`);
      }
    }

    u.pathname = path;
    return u.toString();
  } catch {
    return raw;
  }
}
