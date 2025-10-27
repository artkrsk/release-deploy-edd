#!/bin/bash
set -e

# Load config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Extract config values using Node.js
get_config() {
  node -e "import('file://$PROJECT_ROOT/release.config.js').then(m => console.log(m.default.$1))"
}

ZIP_FILE=$(get_config "plugin.zipFile")
PLUGIN_SLUG=$(get_config "plugin.slug")

echo "🔍 Validating build for: $PLUGIN_SLUG"

# Check ZIP exists
if [ ! -f "$ZIP_FILE" ]; then
  echo "❌ ZIP file not found: $ZIP_FILE"
  echo "Run: pnpm run build"
  exit 1
fi

# Extract ZIP
echo "📦 Extracting ZIP..."
TEMP_DIR="/tmp/validate-build-$$"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
unzip -q "$ZIP_FILE" -d "$TEMP_DIR"

PLUGIN_DIR="$TEMP_DIR/$PLUGIN_SLUG"

# Get critical files from config
CRITICAL_FILES=$(node -e "
  import('file://$PROJECT_ROOT/release.config.js')
    .then(m => console.log(m.default.validation.criticalFiles.join('\n')))
")

# Check critical files
echo "$CRITICAL_FILES" | while IFS= read -r file; do
  if [ ! -f "$PLUGIN_DIR/$file" ]; then
    echo "❌ Missing: $file"
    rm -rf "$TEMP_DIR"
    exit 1
  fi
  echo "✓ $file"
done

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Build validation passed"

