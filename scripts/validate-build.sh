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

# Check critical files. Use a here-string (not a pipe) so the loop runs in the
# current shell: a piped `while ... exit 1` runs in a subshell and cannot fail the
# script, so missing files would otherwise slip through and validation always passed.
FAILED=0
while IFS= read -r file; do
  [ -z "$file" ] && continue
  if [ ! -f "$PLUGIN_DIR/$file" ]; then
    echo "❌ Missing: $file"
    FAILED=1
  else
    echo "✓ $file"
  fi
done <<< "$CRITICAL_FILES"

# Cleanup
rm -rf "$TEMP_DIR"

if [ "$FAILED" -ne 0 ]; then
  echo "❌ Build validation failed"
  exit 1
fi

echo "✅ Build validation passed"

