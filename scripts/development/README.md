# Development Scripts

This directory contains development and testing utilities for the InfiniFox project.

## Available Scripts

### test-theme.sh
A bash script that sets up and launches the InfiniFox development server with a focus on testing the theme switching system. The script ensures dependencies are installed and provides guidance for testing theme functionality.

**Usage:**
```bash
bash scripts/development/test-theme.sh
```

## Testing Features

The theme testing script facilitates testing of the following features:
- Light and dark mode switching
- System theme detection and synchronization
- Keyboard shortcuts for theme toggling (Ctrl/Cmd + Shift + L)
- Visual consistency across all UI components

## Running Development Scripts

These scripts can be executed directly or through npm scripts defined in package.json:
- `npm run theme:test` - Launch theme testing environment
