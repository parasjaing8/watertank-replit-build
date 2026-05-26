#!/usr/bin/env bash
# release_firmware.sh — compile WaterTank firmware and publish a GitHub release
#
# Usage:
#   ./scripts/release_firmware.sh 1.0.0 "Initial BLE OTA release"
#   ./scripts/release_firmware.sh 1.1.0 "Fix tank sim step size"
#
# Requirements:
#   arduino-cli   — brew install arduino-cli
#   gh            — brew install gh  (authenticated: gh auth login)
#   shasum        — built-in macOS
#
# What it does:
#   1. Compiles firmware/WaterTank/ with arduino-cli
#   2. Calculates SHA256 of the .bin
#   3. Writes manifest.json  (version, url, size, sha256, changelog)
#   4. Creates GitHub release tag fw-vX.Y.Z
#   5. Uploads WaterTank.ino.bin + manifest.json as release assets
#   6. Prints the release URL

set -euo pipefail

# ── Args ──────────────────────────────────────────────────────────────────────

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <version> <changelog>"
  echo "  e.g. $0 1.0.0 'Initial BLE OTA release'"
  exit 1
fi

VERSION="$1"
CHANGELOG="$2"
TAG="fw-v${VERSION}"

# ── Paths ─────────────────────────────────────────────────────────────────────

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIRMWARE_DIR="${REPO_ROOT}/firmware/WaterTank"
BUILD_DIR="${FIRMWARE_DIR}/build/esp32.esp32.esp32wrover"
BIN="${BUILD_DIR}/WaterTank.ino.bin"
MANIFEST="${BUILD_DIR}/manifest.json"
FQBN="esp32:esp32:esp32wrover"
REPO="parasjaing8/watertank-replit-build"

# ── Verify FW_VERSION matches arg ─────────────────────────────────────────────

INO_VERSION=$(grep -oE '#define FW_VERSION "[^"]+"' "${FIRMWARE_DIR}/WaterTank.ino" | grep -oE '"[^"]+"' | tr -d '"')
if [[ "$INO_VERSION" != "$VERSION" ]]; then
  echo "ERROR: FW_VERSION in WaterTank.ino is '${INO_VERSION}' but you passed '${VERSION}'"
  echo "Update '#define FW_VERSION \"${VERSION}\"' in WaterTank.ino first."
  exit 1
fi

echo "==> Compiling firmware v${VERSION}..."
arduino-cli compile \
  --fqbn "${FQBN}" \
  --export-binaries \
  "${FIRMWARE_DIR}" 2>&1 | grep -E "Sketch uses|error:|warning:" || true

if [[ ! -f "$BIN" ]]; then
  echo "ERROR: Binary not found at ${BIN}"
  exit 1
fi

# ── Size check ────────────────────────────────────────────────────────────────

SIZE=$(wc -c < "$BIN" | tr -d ' ')
MAX=1310720  # 1.25MB — default OTA partition size
if [[ $SIZE -gt $MAX ]]; then
  echo "ERROR: Binary ${SIZE} bytes exceeds OTA partition ${MAX} bytes"
  exit 1
fi
echo "    Binary: ${SIZE} bytes ($(( SIZE * 100 / MAX ))% of ${MAX})"

# ── SHA256 ────────────────────────────────────────────────────────────────────

SHA256=$(shasum -a 256 "$BIN" | cut -d' ' -f1)
echo "    SHA256: ${SHA256}"

# ── Check tag doesn't already exist ───────────────────────────────────────────

if gh release view "$TAG" --repo "$REPO" &>/dev/null; then
  echo "ERROR: Release ${TAG} already exists. Bump FW_VERSION."
  exit 1
fi

# ── manifest.json ─────────────────────────────────────────────────────────────

DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${TAG}/WaterTank.ino.bin"

cat > "$MANIFEST" << MANIFEST_EOF
{
  "version": "${VERSION}",
  "url": "${DOWNLOAD_URL}",
  "size": ${SIZE},
  "sha256": "${SHA256}",
  "changelog": "${CHANGELOG}",
  "min_app_version": "1.0.0"
}
MANIFEST_EOF

echo "    Manifest written."

# ── GitHub release ────────────────────────────────────────────────────────────

echo "==> Creating GitHub release ${TAG}..."
RELEASE_URL=$(gh release create "$TAG" \
  --repo "$REPO" \
  --title "Firmware v${VERSION}" \
  --notes "## WaterTank Firmware v${VERSION}

${CHANGELOG}

### Files
| File | Description |
|------|-------------|
| \`WaterTank.ino.bin\` | Flash via BLE OTA from the WaterTank app |
| \`manifest.json\` | Version manifest for app update check |

### Size
${SIZE} bytes (SHA256: \`${SHA256}\`)" \
  "$BIN" \
  "$MANIFEST" \
  --target bleOTA)

echo ""
echo "==> Done! Release: ${RELEASE_URL}"
echo "    Tag:     ${TAG}"
echo "    Version: ${VERSION}"
echo "    SHA256:  ${SHA256}"
