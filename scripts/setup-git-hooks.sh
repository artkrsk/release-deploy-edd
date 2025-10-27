#!/bin/bash

# Setup Git hooks to protect main branch

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

echo "🔧 Setting up Git hooks..."

# Create pre-commit hook to prevent direct commits to main
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash

# Prevent direct commits to main branch
# Only allow commits on main via merge or with --no-verify flag

BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$BRANCH" = "main" ]; then
  # Check if this is a merge commit
  if [ -f .git/MERGE_HEAD ]; then
    echo "✅ Merge commit detected - allowing commit to main"
    exit 0
  fi

  echo ""
  echo "❌ Direct commits to 'main' branch are not allowed!"
  echo ""
  echo "The 'main' branch is reserved for releases only."
  echo ""
  echo "Please:"
  echo "  1. Switch to develop branch:"
  echo "     git checkout develop"
  echo ""
  echo "  2. Make your changes there"
  echo ""
  echo "  3. When ready for release, merge to main:"
  echo "     git checkout main"
  echo "     git merge develop"
  echo "     git tag v1.0.x"
  echo "     git push origin main v1.0.x"
  echo ""
  echo "To override this check (not recommended):"
  echo "  git commit --no-verify"
  echo ""
  exit 1
fi

exit 0
EOF

chmod +x "$HOOKS_DIR/pre-commit"

echo "✅ Pre-commit hook installed (prevents direct commits to main)"
echo ""
echo "📋 Git Workflow Summary:"
echo "  • develop - Active development (default branch)"
echo "  • main - Release-ready code only (protected)"
echo ""
echo "💡 To release:"
echo "  git checkout main"
echo "  git merge develop"
echo "  git tag v1.0.x"
echo "  git push origin main v1.0.x"
echo ""
