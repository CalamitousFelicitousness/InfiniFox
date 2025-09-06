# Analysis Scripts

This directory contains code analysis utilities for the InfiniFox project.

## Available Scripts

### find-emojis.py
Scans the codebase for emoji characters that may cause issues in certain environments or build processes. The script excludes emojis within console.log statements and provides detailed location information for each finding.

**Usage:**
```bash
python scripts/analysis/find-emojis.py
```

### find-hardcoded.py
Identifies hardcoded values, strings, and configuration that should potentially be moved to configuration files or environment variables.

**Usage:**
```bash
python scripts/analysis/find-hardcoded.py
```

## Running Analysis Scripts

These scripts can be executed directly or through npm scripts defined in package.json:
- `npm run analyze:emojis` - Run emoji detection
- `npm run analyze:hardcoded` - Find hardcoded values
