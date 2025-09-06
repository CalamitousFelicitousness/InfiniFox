# InfiniFox Styling Guidelines v1.1

## Three-Tier Style Architecture

### Tier 1: Design System Foundation
**Location:** `src/themes/styles/`
**Purpose:** Core design system tokens and foundational styles
**Files:**
- `token-variables.css` - Design tokens (colors, spacing, typography, etc.)
- `reset.css` - CSS reset/normalize
- `global.css` - Global element styles
- `utilities.css` - Utility classes
- `layout.css` - Layout system classes
- `icons.css` - Icon system styles

### Tier 2: Shared Component Patterns
**Location:** `src/themes/styles/components/`
**Purpose:** Reusable component styles used by 2+ components
**Files:**
- `buttons.css` - Button variants, states, and groups
- `inputs.css` - Form input styles
- `panels.css` - Panel containers
- `glass.css` - Glass morphism effects
- `floating-panels.css` - Draggable floating panel patterns
- `menus.css` - Context menus and dropdowns
- `controls.css` - Sliders and form control layouts
- `color-picker.css` - Color selection components
- `toggles.css` - Toggle groups and checkboxes
- `toolbars.css` - Toolbar layouts
- `headers.css` - Header patterns
- `canvas.css` - Canvas-specific styles

### Tier 3: Feature-Specific Styles
**Location:** Co-located with component
**Purpose:** Unique styles for single components
**Examples:**
- `Canvas.css` next to `Canvas.tsx`
- `Timeline.css` next to `Timeline.tsx`

## Token Usage Requirements

### Strict Rules
- **NEVER** hardcode colors, spacing, or typography values
- **ALWAYS** use CSS variables: `var(--token-name)`
- **NO** magic numbers - use spacing tokens

### Token Categories

#### Colors
```css
/* ✅ CORRECT */
background: var(--color-background-primary);
color: var(--color-text-primary);
border-color: var(--color-border-primary);

/* ❌ WRONG */
background: #1a1a1a;
color: rgba(255, 255, 255, 0.95);
border-color: #444;
```

#### Spacing
```css
/* ✅ CORRECT */
padding: var(--spacing-4) var(--spacing-6);
margin-bottom: var(--spacing-2);
gap: var(--spacing-component-base);

/* ❌ WRONG */
padding: 16px 24px;
margin-bottom: 8px;
gap: 1rem;
```

#### Typography
```css
/* ✅ CORRECT */
font-size: var(--font-size-base);
font-weight: var(--font-weight-medium);
line-height: var(--line-height-normal);

/* ❌ WRONG */
font-size: 14px;
font-weight: 500;
line-height: 1.5;
```

#### Animations
```css
/* ✅ CORRECT */
transition: var(--transition-colors);
animation: var(--animation-fade-in);
transition-duration: var(--duration-fast);

/* ❌ WRONG */
transition: all 0.2s ease;
animation: fadeIn 0.3s;
transition-duration: 200ms;
```

## File Placement Rules

| Content Type | Location | Example |
|-------------|----------|---------|
| Component | `features/[feature]/` | `features/canvas/Canvas.tsx` |
| Component Test | Next to component | `features/canvas/Canvas.test.tsx` |
| Component Style | Next to component | `features/canvas/Canvas.css` |
| Shared Style | `themes/styles/components/` | `themes/styles/components/buttons.css` |
| Integration Test | `src/__tests__/integration/` | `canvas-drawing.test.tsx` |
| E2E Test | `src/__tests__/e2e/` | `full-workflow.test.tsx` |

## Import Order (main.tsx)

```tsx
// 1. Token variables (MUST be first)
import '@/themes/styles/token-variables.css';

// 2. Reset
import '@/themes/styles/reset.css';

// 3. Global styles
import '@/themes/styles/global.css';

// 4. Utilities
import '@/themes/styles/utilities.css';

// 5. Layout
import '@/themes/styles/layout.css';

// 6. Icons
import '@/themes/styles/icons.css';

// 7. Component styles (in order)
import '@/themes/styles/components/buttons.css';
import '@/themes/styles/components/inputs.css';
import '@/themes/styles/components/panels.css';
import '@/themes/styles/components/glass.css';
import '@/themes/styles/components/floating-panels.css';
import '@/themes/styles/components/menus.css';
import '@/themes/styles/components/controls.css';
import '@/themes/styles/components/color-picker.css';
import '@/themes/styles/components/toggles.css';
import '@/themes/styles/components/toolbars.css';
import '@/themes/styles/components/headers.css';
import '@/themes/styles/components/canvas.css';
```

## Event Handling Requirements

### Pointer Events Only
The application uses pointer events exclusively for cross-device compatibility.

```tsx
/* ✅ CORRECT */
onPointerDown={handlePointerDown}
onPointerMove={handlePointerMove}
onPointerUp={handlePointerUp}
onPointerEnter={handlePointerEnter}
onPointerLeave={handlePointerLeave}

/* ❌ WRONG */
onMouseDown={handleMouseDown}
onTouchStart={handleTouchStart}
onClick={handleClick}  // Use onPointerUp instead
```

## Shared Pattern Usage

### Glass Morphism
```css
/* Apply glass effect */
.my-component {
  /* Add glass-surface class in JSX */
}
```
```tsx
<div class="glass-surface">...</div>
```

### Floating Panels
```tsx
<div class="floating-panel glass-surface">
  <div class="floating-panel-header">
    <div class="floating-panel-grip">⋮⋮</div>
    <span class="floating-panel-title">Title</span>
    <div class="floating-panel-controls">...</div>
  </div>
  <div class="floating-panel-content">...</div>
</div>
```

### Menus
```tsx
<div class="menu">
  <button class="menu-item">Option 1</button>
  <button class="menu-item">Option 2</button>
  <hr class="menu-divider" />
  <button class="menu-item menu-item-danger">Delete</button>
</div>
```

### Toggle Groups
```tsx
<div class="toggle-group">
  <button class="active">Option A</button>
  <button>Option B</button>
  <button>Option C</button>
</div>
```

### Slider Controls
```tsx
<div class="slider-control">
  <label class="slider-label">Size</label>
  <Slider />
  <span class="slider-value">50px</span>
</div>
```

### Color Palettes
```tsx
<div class="color-palette-grid">
  {colors.map(color => (
    <button class="color-swatch" style={{ backgroundColor: color }} />
  ))}
</div>
```

## Component Styling Patterns

### Basic Component
```css
/* ComponentName.css */
.component-name {
  /* Layout */
  display: flex;
  gap: var(--spacing-4);
  
  /* Spacing */
  padding: var(--spacing-component-base);
  
  /* Visual */
  background: var(--color-surface-primary);
  border-radius: var(--radius-base);
  
  /* Transitions */
  transition: var(--transition-colors);
}

.component-name:hover {
  background: var(--color-surface-hover);
}
```

### State Variants
```css
/* Use data attributes for states */
.button[data-variant="primary"] {
  background: var(--color-primary-500);
}

.button[data-size="large"] {
  padding: var(--spacing-button-padding-y-lg) var(--spacing-button-padding-x-lg);
}

.button:disabled,
.button[data-disabled="true"] {
  opacity: 0.5;
  pointer-events: none;
}
```

### Responsive Design
```css
.panel {
  width: 100%;
}

@media (min-width: 768px) {
  .panel {
    width: var(--layout-control-panel-tablet);
  }
}

@media (min-width: 1024px) {
  .panel {
    width: var(--layout-control-panel-desktop);
  }
}
```

## Shadow and Border Guidelines

### Shadows
```css
/* Panel shadows */
.panel {
  box-shadow: var(--shadow-panel-default);
}

.panel-elevated {
  box-shadow: var(--shadow-panel-elevated);
}

/* Interactive shadows */
.button {
  box-shadow: var(--shadow-button-default);
}

.button:hover {
  box-shadow: var(--shadow-button-hover);
}
```

### Borders
```css
/* Standard borders */
.input {
  border: var(--border-default);
}

.input:focus {
  border: var(--border-interactive-focus);
  outline: none;
}

/* Error states */
.input[data-error="true"] {
  border: var(--border-error);
}
```

## Animation Guidelines

### Performance Rules
1. Animate only `transform` and `opacity` for best performance
2. Use `will-change` sparingly and remove after animation
3. Prefer CSS animations over JavaScript for simple transitions

### Animation Patterns
```css
/* Entrance animation */
.modal {
  animation: var(--animation-scale-in);
}

/* Continuous animation */
.spinner {
  animation: var(--animation-spin);
}

/* Hover transitions */
.card {
  transition: var(--transition-transform);
}

.card:hover {
  transform: translateY(-2px);
}
```

## Utility Classes

### When to Use
- Simple, single-purpose styling
- Rapid prototyping
- Overriding component styles

### Common Utilities
```css
/* Spacing */
.p-4 { padding: var(--spacing-4); }
.m-2 { margin: var(--spacing-2); }
.gap-3 { gap: var(--spacing-3); }

/* Display */
.flex { display: flex; }
.hidden { display: none; }
.block { display: block; }

/* Text */
.text-primary { color: var(--color-text-primary); }
.text-sm { font-size: var(--font-size-sm); }
.font-bold { font-weight: var(--font-weight-bold); }
```

## Style Extraction Decision Tree

```
Is the style used by multiple components?
├─ YES → Extract to themes/styles/components/
│   └─ Name by pattern (buttons.css, inputs.css)
└─ NO → Keep co-located with component
    └─ Will it likely be reused?
        ├─ YES → Consider extraction
        └─ NO → Keep co-located
```

## CSS Organization Within Files

```css
/* 1. CSS Variables/Custom Properties */
.component {
  --local-spacing: var(--spacing-4);
  --local-color: var(--color-primary-500);
}

/* 2. Layout Properties */
.component {
  display: flex;
  position: relative;
  flex-direction: column;
  align-items: center;
}

/* 3. Spacing Properties */
.component {
  padding: var(--spacing-4);
  margin: var(--spacing-2);
  gap: var(--spacing-3);
}

/* 4. Visual Properties */
.component {
  background: var(--color-surface-primary);
  color: var(--color-text-primary);
  border: var(--border-default);
  border-radius: var(--radius-base);
}

/* 5. Typography */
.component {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
}

/* 6. Animations/Transitions */
.component {
  transition: var(--transition-colors);
  animation: var(--animation-fade-in);
}

/* 7. Interactive States */
.component:hover { }
.component:focus { }
.component:active { }
.component:disabled { }

/* 8. Modifiers/Variants */
.component[data-variant="primary"] { }
.component[data-size="large"] { }

/* 9. Child Elements */
.component__header { }
.component__body { }
.component__footer { }

/* 10. Media Queries */
@media (min-width: 768px) {
  .component { }
}
```

## Common Mistakes to Avoid

### ❌ Hardcoded Values
```css
/* WRONG */
.panel {
  padding: 20px;
  background: #2a2a2a;
  border-radius: 8px;
}
```

### ✅ Use Tokens
```css
/* CORRECT */
.panel {
  padding: var(--spacing-5);
  background: var(--color-surface-primary);
  border-radius: var(--radius-md);
}
```

### ❌ Inline Styles
```tsx
/* WRONG */
<div style={{ padding: '16px', background: '#333' }}>
```

### ✅ Use Classes or CSS Modules
```tsx
/* CORRECT */
<div className="panel">
```

### ❌ Deep Nesting
```css
/* WRONG */
.panel {
  .header {
    .title {
      .icon {
        /* Too deep! */
      }
    }
  }
}
```

### ✅ Flat Structure
```css
/* CORRECT */
.panel { }
.panel__header { }
.panel__title { }
.panel__icon { }
```

## Theme Switching Support

All styles must support theme switching:

```css
/* Use semantic tokens that can change with themes */
.component {
  /* These will automatically update when theme changes */
  background: var(--color-surface-primary);
  color: var(--color-text-primary);
  
  /* NOT theme-specific hardcoded values */
  /* background: #2a2a2a; */
}
```

## Performance Optimization

### Critical CSS
- Keep initial bundle small
- Lazy load feature-specific styles
- Use CSS modules for tree-shaking (future consideration)

### Render Performance
```css
/* Use transform instead of position changes */
.moving-element {
  transform: translateX(var(--position-x));
  /* NOT: left: var(--position-x); */
}

/* Use CSS containment for complex components */
.complex-component {
  contain: layout style paint;
}
```

## Accessibility Considerations

### Focus Indicators
```css
/* Always provide visible focus indicators */
.interactive-element:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: var(--outline-offset-base);
}

/* Never remove focus indicators without replacement */
/* ❌ WRONG */
.button:focus {
  outline: none;
}

/* ✅ CORRECT */
.button:focus {
  outline: none;
  box-shadow: var(--ring-primary);
}
```

### High Contrast Support
```css
@media (prefers-contrast: high) {
  .component {
    border: var(--border-strong);
  }
}
```

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

## Development Workflow

### Adding New Styles
1. Check if similar style exists in token system
2. Check shared component styles
3. Use existing patterns when possible
4. Create new tokens only when necessary
5. Document any new patterns

### Style Review Checklist
- [ ] All values use design tokens
- [ ] No hardcoded colors or spacing
- [ ] Pointer events used (not mouse/touch)
- [ ] Focus indicators present
- [ ] Transitions use token durations
- [ ] Follows file placement rules
- [ ] Responsive breakpoints use tokens
- [ ] Supports theme switching
- [ ] Uses shared patterns where applicable:
  - [ ] Glass morphism → use `glass-surface`
  - [ ] Floating panels → use `floating-panel` classes
  - [ ] Menus → use `menu` + `menu-item`
  - [ ] Toggles → use `toggle-group`
  - [ ] Sliders → use `slider-control`
  - [ ] Colors → use `color-palette-grid`

### Running Style Analysis
```bash
# Check for hardcoded values
npm run analyze:hardcoded

# Test theme switching
npm run theme:test

# Lint styles
npm run lint:styles
```

## Migration Path

### From Inline Styles
1. Extract to co-located CSS file
2. Replace values with tokens
3. Add appropriate class names

### From Legacy CSS
1. Identify reusable patterns
2. Extract to shared components if used 2+ times
3. Replace hardcoded values with tokens
4. Remove duplicate styles

## Version History

- v1.0 (2025-09-06): Initial comprehensive styling guidelines
- v1.1 (2025-09-06): Added shared pattern usage, updated with 12 component patterns