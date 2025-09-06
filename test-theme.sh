#!/bin/bash

# InfiniFox Theme Testing Script
# This script helps test the theme switching system

echo "🎨 InfiniFox Theme Testing Setup"
echo "================================"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🚀 Starting InfiniFox development server..."
echo ""
echo "Once the server starts:"
echo "1. Open http://localhost:5173 in your browser"
echo "2. Look for the Theme Switcher in the top-right corner"
echo "3. Test switching between Light, Dark, and System modes"
echo "4. Use Ctrl/Cmd + Shift + L to toggle themes"
echo ""
echo "🧪 Testing checklist available in:"
echo "   - Theme Testing Checklist (artifact)"
echo "   - src/components/ThemeTestPage.tsx (optional test page)"
echo ""

# Start the dev server
npm run dev
