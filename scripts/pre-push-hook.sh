#!/bin/bash
set -e

# Load config
# When run as git hook from .git/hooks/pre-push, we need to go up to project root
# When run directly from scripts/, we need to go up one level
if [[ "${BASH_SOURCE[0]}" == *".git/hooks"* ]]; then
  # Running as git hook: .git/hooks/pre-push -> go up 2 levels to project root
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
else
  # Running directly from scripts/: go up 1 level
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

get_config() {
  node -e "import('file://$PROJECT_ROOT/release.config.js').then(m => console.log(m.default.$1))" 2>/dev/null || {
    echo "❌ Error: Could not load release.config.js from $PROJECT_ROOT" >&2
    exit 1
  }
}

MAIN_FILE=$(get_config "plugin.mainFile")

# Validate we got the config
if [ -z "$MAIN_FILE" ]; then
  echo "❌ Error: Could not read plugin configuration" >&2
  echo "   Project root: $PROJECT_ROOT" >&2
  echo "   Config file: $PROJECT_ROOT/release.config.js" >&2
  exit 1
fi

# Get the tag being pushed (if any)
while read local_ref local_sha remote_ref remote_sha
do
  # Only run for version tags
  if [[ $remote_ref == refs/tags/v* ]]; then
    TAG_NAME=$(echo $remote_ref | sed 's|refs/tags/||')
    TAG_VERSION=${TAG_NAME#v}
    
    echo ""
    echo "🏷️  Pushing tag: $TAG_NAME"
    echo "🔍 Running pre-push validation..."
    echo ""
    
    # 1. Check version consistency
    echo "📌 Checking version consistency..."
    PLUGIN_VERSION=$(grep -m 1 "Version:" "$MAIN_FILE" | awk '{print $3}' | tr -d '\r')
    README_VERSION=$(grep "Stable tag:" src/wordpress-plugin/readme.txt | awk '{print $3}' | tr -d '\r')
    PACKAGE_VERSION=$(node -p "require('./package.json').version")
    
    if [ "$TAG_VERSION" != "$PLUGIN_VERSION" ] || [ "$TAG_VERSION" != "$README_VERSION" ] || [ "$TAG_VERSION" != "$PACKAGE_VERSION" ]; then
      echo "❌ Version mismatch detected!"
      echo "   Tag:          $TAG_VERSION"
      echo "   Plugin file:  $PLUGIN_VERSION"
      echo "   Readme:       $README_VERSION"
      echo "   package.json: $PACKAGE_VERSION"
      echo ""
      echo "💡 Update all versions to match and try again."
      exit 1
    fi
    echo "✅ Versions match: $TAG_VERSION"
    echo ""
    
    # 2. Build the plugin
    echo "🔨 Building plugin..."
    pnpm run build
    if [ $? -ne 0 ]; then
      echo "❌ Build failed!"
      exit 1
    fi
    echo "✅ Build successful"
    echo ""
    
    # 3. Run unit tests (Vitest)
    echo "🧪 Running unit tests..."
    pnpm run test || {
      echo "❌ Unit tests failed"
      exit 1
    }
    echo "✅ Unit tests passed"
    echo ""

    # 4. Run static analysis (PHPStan)
    echo "🔍 Running PHP static analysis..."
    composer run phpstan || {
      echo "❌ PHPStan found issues"
      exit 1
    }
    echo "✅ Static analysis passed"
    echo ""

    # 5. Run PHPCS (coding standards)
    echo "🔍 Running PHP coding standards check..."
    composer run phpcs || {
      echo "❌ PHPCS found issues"
      exit 1
    }
    echo "✅ Coding standards passed"
    echo ""
    
    # 6. Validate ZIP structure
    echo "🔍 Validating ZIP structure..."
    pnpm run validate
    if [ $? -ne 0 ]; then
      echo "❌ Validation failed!"
      exit 1
    fi
    echo ""
    
    # 7. All checks passed
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ All pre-push checks passed!"
    echo "🚀 Pushing tag $TAG_NAME to trigger release..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
  fi
done

exit 0

