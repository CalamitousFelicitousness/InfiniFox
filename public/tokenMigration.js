/**
 * InfiniFox Theme Engine - Component Token Migration & Validation
 * Run this in the browser console to identify and fix token usage issues
 */

// ============================================
// TOKEN MAPPING TABLE
// ============================================
const tokenMappings = {
  // Old variables -> New token system
  '--primary-bg-color': '--color-background-primary',
  '--secondary-bg-color': '--color-surface-primary',
  '--primary-text-color': '--color-text-primary',
  '--secondary-text-color': '--color-text-secondary',
  '--text-color': '--color-text-primary',
  '--accent-color': '--color-interactive-primary',
  '--accent-color-dark': '--color-interactive-primary-active',
  '--border-color': '--color-border-primary',
  '--font-family': '--font-family-base',
  
  // Direct color values -> Token replacements
  '#1a1a1a': 'var(--color-background-primary)',
  '#2a2a2a': 'var(--color-surface-primary)',
  '#ffffff': 'var(--color-text-primary)',
  '#a0a0a0': 'var(--color-text-secondary)',
  '#646cff': 'var(--color-interactive-primary)',
  '#535bf2': 'var(--color-interactive-primary-active)',
  '#444444': 'var(--color-border-primary)',
  'rgba(255, 255, 255, 0.95)': 'var(--color-text-primary)',
  'rgba(255, 255, 255, 0.7)': 'var(--color-text-secondary)',
  'rgba(255, 255, 255, 0.5)': 'var(--color-text-tertiary)',
  'rgba(255, 255, 255, 0.1)': 'var(--color-border-primary)',
  'rgba(42, 42, 42, 0.95)': 'var(--custom-glass-bg)',
  
  // Spacing values -> Token replacements
  '1rem': 'var(--spacing-4)',
  '2rem': 'var(--spacing-8)',
  '0.5rem': 'var(--spacing-2)',
  '0.75rem': 'var(--spacing-3)',
  '0.25rem': 'var(--spacing-1)',
  '1.5rem': 'var(--spacing-6)',
  
  // Border radius -> Token replacements
  '4px': 'var(--radius-sm)',
  '6px': 'var(--radius-base)',
  '8px': 'var(--radius-md)',
  '12px': 'var(--radius-lg)',
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Check if elements are using theme tokens
 */
function validateTokenUsage() {
  console.log('🔍 Validating Token Usage...\n');
  
  const selectors = [
    { selector: '.panel, .control-panel', name: 'Panels' },
    { selector: '.btn, .generate-btn, button', name: 'Buttons' },
    { selector: 'input, textarea, select', name: 'Form Inputs' },
    { selector: '.tabs', name: 'Tabs' },
    { selector: '.form-group', name: 'Form Groups' },
  ];
  
  const results = [];
  let totalIssues = 0;
  
  selectors.forEach(({ selector, name }) => {
    const elements = document.querySelectorAll(selector);
    let usingTokens = 0;
    let notUsingTokens = 0;
    const issues = [];
    
    elements.forEach(el => {
      const styles = window.getComputedStyle(el);
      const hasTokens = checkElementForTokens(el, styles);
      
      if (hasTokens.using) {
        usingTokens++;
      } else {
        notUsingTokens++;
        if (hasTokens.issues.length > 0) {
          issues.push({
            element: el,
            problems: hasTokens.issues
          });
        }
      }
    });
    
    totalIssues += issues.length;
    
    results.push({
      name,
      total: elements.length,
      usingTokens,
      notUsingTokens,
      status: notUsingTokens === 0 ? '✅' : '⚠️',
      issues
    });
  });
  
  // Display results
  console.table(results.map(r => ({
    Component: r.name,
    Total: r.total,
    'Using Tokens': r.usingTokens,
    'Not Using': r.notUsingTokens,
    Status: r.status
  })));
  
  // Show detailed issues
  if (totalIssues > 0) {
    console.log('\n⚠️ ISSUES FOUND:');
    results.forEach(r => {
      if (r.issues.length > 0) {
        console.log(`\n${r.name}:`);
        r.issues.forEach((issue, i) => {
          console.log(`  ${i + 1}. Element:`, issue.element);
          console.log('     Problems:', issue.problems);
        });
      }
    });
  } else {
    console.log('\n✅ All components using theme tokens!');
  }
  
  return totalIssues === 0;
}

/**
 * Check if an element is using theme tokens
 */
function checkElementForTokens(element, styles) {
  const tokenProperties = [
    'background-color',
    'color',
    'border-color',
    'padding',
    'margin',
    'border-radius',
    'font-family'
  ];
  
  const issues = [];
  let hasAnyTokens = false;
  
  tokenProperties.forEach(prop => {
    const value = styles.getPropertyValue(prop);
    if (value) {
      // Check if value uses CSS variables
      if (value.includes('var(--')) {
        // Check if it's using old variables
        if (value.includes('--primary-bg-color') ||
            value.includes('--secondary-bg-color') ||
            value.includes('--primary-text-color') ||
            value.includes('--accent-color') ||
            value.includes('--border-color')) {
          issues.push(`${prop}: using old variable (${value})`);
        } else {
          hasAnyTokens = true;
        }
      } else if (isHardcodedValue(value)) {
        issues.push(`${prop}: hardcoded value (${value})`);
      }
    }
  });
  
  return {
    using: hasAnyTokens && issues.length === 0,
    issues
  };
}

/**
 * Check if a value is hardcoded
 */
function isHardcodedValue(value) {
  const hardcodedPatterns = [
    /^#[0-9a-f]{3,6}$/i,  // Hex colors
    /^rgb/,                // RGB colors
    /^\d+px$/,             // Pixel values
    /^\d+(\.\d+)?rem$/,    // Rem values (except 0)
  ];
  
  // Skip inherit, initial, auto, none, transparent
  const skipValues = ['inherit', 'initial', 'auto', 'none', 'transparent', '0', '0px'];
  if (skipValues.includes(value)) return false;
  
  return hardcodedPatterns.some(pattern => pattern.test(value));
}

// ============================================
// AUTO-FIX FUNCTIONS
// ============================================

/**
 * Generate CSS fixes for components
 */
function generateCSSFixes() {
  console.log('\n📝 GENERATED CSS FIXES:\n');
  
  const fixes = `
/* ========================================
   COMPONENT TOKEN FIXES
   Apply these to your CSS files
   ======================================== */

/* Fix panels */
.panel,
.control-panel {
  background-color: var(--color-surface-primary);
  color: var(--color-text-primary);
  padding: var(--spacing-panel-padding-base);
  border: var(--border-default);
}

/* Fix buttons */
.btn,
.generate-btn,
button {
  background-color: var(--color-interactive-primary);
  color: var(--color-text-on-primary);
  padding: var(--spacing-button-padding-y-base) var(--spacing-button-padding-x-base);
  border-radius: var(--radius-button-base);
  border: none;
  transition: var(--transition-button);
}

.btn:hover,
.generate-btn:hover,
button:hover {
  background-color: var(--color-interactive-primary-hover);
}

/* Fix inputs */
input,
textarea,
select {
  background-color: var(--color-background-primary);
  color: var(--color-text-primary);
  border: var(--border-default);
  border-radius: var(--radius-input-base);
  padding: var(--spacing-2);
  transition: var(--transition-input);
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--color-border-focus);
  box-shadow: var(--ring-primary);
  outline: none;
}

/* Fix tabs */
.tabs {
  background-color: var(--color-background-secondary);
  border-bottom: var(--border-default);
}

.tabs button {
  color: var(--color-text-secondary);
  background-color: transparent;
  padding: var(--spacing-3);
  transition: var(--transition-colors);
}

.tabs button.active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-interactive-primary);
}
`;
  
  console.log(fixes);
  
  // Create a temporary style element to test fixes
  const styleEl = document.createElement('style');
  styleEl.id = 'theme-token-fixes';
  styleEl.textContent = fixes;
  
  return styleEl;
}

/**
 * Apply fixes temporarily for testing
 */
function applyFixes() {
  // Remove existing fixes if any
  const existing = document.getElementById('theme-token-fixes');
  if (existing) existing.remove();
  
  // Apply new fixes
  const fixes = generateCSSFixes();
  document.head.appendChild(fixes);
  
  console.log('✅ Fixes applied! Run validateTokenUsage() to check results.');
}

/**
 * Remove temporary fixes
 */
function removeFixes() {
  const fixes = document.getElementById('theme-token-fixes');
  if (fixes) {
    fixes.remove();
    console.log('✅ Temporary fixes removed');
  } else {
    console.log('ℹ️ No temporary fixes to remove');
  }
}

// ============================================
// COMPREHENSIVE TEST
// ============================================

function runTokenMigrationTest() {
  console.log('🚀 TOKEN MIGRATION TEST\n');
  console.log('============================================================\n');
  
  // 1. Initial validation
  console.log('📊 BEFORE FIXES:');
  const beforeValid = validateTokenUsage();
  
  if (!beforeValid) {
    console.log('\n🔧 APPLYING FIXES...');
    applyFixes();
    
    // 2. Validate after fixes
    console.log('\n📊 AFTER FIXES:');
    const afterValid = validateTokenUsage();
    
    if (afterValid) {
      console.log('\n✅ SUCCESS! All components now using theme tokens.');
      console.log('📝 Copy the generated CSS fixes to your main.css file.');
    } else {
      console.log('\n⚠️ Some issues remain. Manual inspection needed.');
    }
  } else {
    console.log('\n✅ All components already using theme tokens!');
  }
  
  console.log('\n============================================================');
  console.log('📝 Next steps:');
  console.log('1. Update main.css with the token-based styles');
  console.log('2. Remove old CSS variables from :root');
  console.log('3. Update any component-specific CSS files');
  console.log('4. Test theme switching with updated styles');
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

window.tokenMigration = {
  validate: validateTokenUsage,
  generateFixes: generateCSSFixes,
  applyFixes: applyFixes,
  removeFixes: removeFixes,
  runTest: runTokenMigrationTest,
  mappings: tokenMappings
};

console.log('✨ Token Migration Tools Loaded!');
console.log('Commands:');
console.log('  tokenMigration.validate()     - Check current token usage');
console.log('  tokenMigration.generateFixes() - Generate CSS fixes');
console.log('  tokenMigration.applyFixes()    - Apply fixes temporarily');
console.log('  tokenMigration.removeFixes()   - Remove temporary fixes');
console.log('  tokenMigration.runTest()       - Run complete test');
console.log('\nRun tokenMigration.runTest() to start!');