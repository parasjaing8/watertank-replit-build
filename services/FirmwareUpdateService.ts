const GITHUB_RELEASES_API =
  "https://api.github.com/repos/parasjaing8/watertank-replit-build/releases/latest";

export interface FirmwareManifest {
  version: string;
  url: string;
  size: number;
  sha256: string;
  changelog: string;
  min_app_version: string;
}

function semverGt(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
  }
  return false;
}

// Returns the latest firmware manifest if a newer version exists, null otherwise.
// Throws if network is unavailable — caller should catch and treat as no-update.
export async function checkFirmwareUpdate(
  currentVersion: string,
): Promise<FirmwareManifest | null> {
  const releaseRes = await fetch(GITHUB_RELEASES_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!releaseRes.ok) return null;

  const release = (await releaseRes.json()) as {
    tag_name: string;
    assets: { name: string; browser_download_url: string }[];
  };

  // Only firmware releases are tagged fw-vX.Y.Z
  if (!release.tag_name.startsWith("fw-v")) return null;

  const manifestAsset = release.assets.find((a) => a.name === "manifest.json");
  if (!manifestAsset) return null;

  const manifestRes = await fetch(manifestAsset.browser_download_url);
  if (!manifestRes.ok) return null;

  const manifest = (await manifestRes.json()) as FirmwareManifest;

  if (!semverGt(manifest.version, currentVersion)) return null;

  return manifest;
}
