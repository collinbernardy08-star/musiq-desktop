#!/bin/bash
# Spotify Tracker Desktop – Setup Script

set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Spotify Tracker Desktop Setup      ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js nicht gefunden. Bitte installiere Node.js 18+ von https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js Version zu alt. Bitte aktualisiere auf Node.js 18+"
  exit 1
fi

echo "✓ Node.js $(node -v) gefunden"
echo ""

# Main dependencies
echo "📦 Installiere Haupt-Dependencies..."
npm install
echo "✓ Haupt-Dependencies installiert"
echo ""

# Renderer dependencies
echo "📦 Installiere Renderer-Dependencies..."
cd src/renderer
npm install
cd ../..
echo "✓ Renderer-Dependencies installiert"
echo ""

echo "╔══════════════════════════════════════╗"
echo "║          Setup abgeschlossen!        ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Starten mit:"
echo "  npm run dev     → Development Mode"
echo "  npm run dist    → Build & Package"
echo ""
