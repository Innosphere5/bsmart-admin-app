#!/usr/bin/env bash
# ==============================================================================
# B'Smart Dresses - Instant EAS OTA Update Script for Existing APK
# ==============================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo "🚀 B'Smart Dresses - Publishing Instant EAS Update for APK"
echo "=========================================================="

# Check if logged in or EXPO_TOKEN exists
if ! npx eas-cli whoami >/dev/null 2>&1; then
  if [ -z "$EXPO_TOKEN" ]; then
    echo "🔑 EAS login required. Please log in with your Expo credentials:"
    npx eas-cli login
  fi
fi

MESSAGE="${1:-Store Closure Banner and Instant Update Engine}"

echo ""
echo "📤 1. Publishing update to 'production' channel (Runtime: 1.0.0)..."
npx eas-cli update --channel production --environment production --message "$MESSAGE" --platform android --non-interactive

echo ""
echo "📤 2. Publishing update to 'preview' channel (Runtime: 1.0.0)..."
npx eas-cli update --channel preview --environment preview --message "$MESSAGE" --platform android --non-interactive

echo ""
echo "=========================================================="
echo "✅ SUCCESS! EAS Updates successfully published."
echo "📲 Existing installed APKs will download and apply this update"
echo "   immediately upon opening or resuming the app."
echo "=========================================================="
