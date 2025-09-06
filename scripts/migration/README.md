# Migration Scripts

This directory is designated for database migration, data transformation, and system upgrade scripts for the InfiniFox project.

## Purpose

Migration scripts handle transitions between different versions of the application, data structures, or system configurations. These scripts ensure smooth upgrades and maintain data integrity during system evolution.

## Script Categories

### Database Migrations
Scripts that handle changes to data structures or storage formats used by the application.

### Configuration Migrations
Scripts that update configuration files or settings when the application structure changes.

### Asset Migrations
Scripts that process or convert assets when moving between different systems or formats.

## Usage Guidelines

All migration scripts should be idempotent, allowing them to be run multiple times without causing issues. Each script should include version information and clearly document what changes it performs.

## Current Status

### Active Scripts

#### cleanup-empty-dirs.sh
Removes empty directories identified during the consistency project:
- `test/` - Empty directory at project root
- `src/styles/` - Empty styles directory (superseded by themes/styles/)

Run with: `bash scripts/migration/cleanup-empty-dirs.sh`
