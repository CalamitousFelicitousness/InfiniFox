/**
 * Theme Test Page
 * Comprehensive test of all theme components and tokens
 */

import { h } from 'preact'
import { useState } from 'preact/hooks'
import { useTheme } from '../themes/ThemeProvider'
import { Brush, Pencil, Search, Undo2 } from 'lucide-preact'
import { Icon } from './common/Icon'
import './ThemeTestPage.css'

export function ThemeTestPage() {
  const { theme, currentThemeName } = useTheme()
  const [activeTab, setActiveTab] = useState('colors')
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [showTooltip, setShowTooltip] = useState(false)
  
  // Simulate loading
  const simulateLoading = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000)
  }
  
  return (
    <div className="theme-test-page">
      <header className="test-header">
        <h1>InfiniFox Theme Testing</h1>
        <p>Current Theme: <strong>{currentThemeName}</strong> ({theme.mode} mode)</p>
      </header>
      
      {/* Tab Navigation */}
      <div className="tabs-container">
        <div className="tabs-header">
          <div className="tabs-list">
            {['colors', 'typography', 'components', 'forms', 'canvas'].map(tab => (
              <button
                key={tab}
                className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="tabs-content">
          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <div className="tab-panel active">
              <h2>Color Palette</h2>
              
              <h3>Background Colors</h3>
              <div className="color-grid">
                <div className="color-swatch bg-primary">Primary</div>
                <div className="color-swatch bg-secondary">Secondary</div>
                <div className="color-swatch bg-tertiary">Tertiary</div>
                <div className="color-swatch bg-elevated">Elevated</div>
              </div>
              
              <h3>Text Colors</h3>
              <div className="text-samples">
                <p className="text-primary">Primary text color</p>
                <p className="text-secondary">Secondary text color</p>
                <p className="text-tertiary">Tertiary text color</p>
                <p className="text-muted">Muted text color</p>
              </div>
              
              <h3>Status Colors</h3>
              <div className="status-grid">
                <div className="status-badge status-success">Success</div>
                <div className="status-badge status-warning">Warning</div>
                <div className="status-badge status-danger">Danger</div>
                <div className="status-badge status-info">Info</div>
              </div>
              
              <h3>Border Colors</h3>
              <div className="border-samples">
                <div className="border-box border-default">Default Border</div>
                <div className="border-box border-subtle">Subtle Border</div>
                <div className="border-box border-hover">Hover Border</div>
                <div className="border-box border-focus">Focus Border</div>
              </div>
            </div>
          )}
          
          {/* Typography Tab */}
          {activeTab === 'typography' && (
            <div className="tab-panel active">
              <h2>Typography Scale</h2>
              
              <div className="typography-samples">
                <h1 className="heading-1">Heading 1 - Bold & Beautiful</h1>
                <h2 className="heading-2">Heading 2 - Strong & Clear</h2>
                <h3 className="heading-3">Heading 3 - Organized & Structured</h3>
                <h4 className="heading-4">Heading 4 - Detailed & Precise</h4>
                
                <p className="body-text">
                  This is body text with normal weight. It should be easily readable 
                  with good contrast against the background. The line height and 
                  letter spacing are optimized for readability.
                </p>
                
                <p className="body-text-small">
                  Small body text for less prominent information.
                </p>
                
                <div className="font-weights">
                  <span className="weight-light">Light 300</span>
                  <span className="weight-regular">Regular 400</span>
                  <span className="weight-medium">Medium 500</span>
                  <span className="weight-semibold">Semibold 600</span>
                  <span className="weight-bold">Bold 700</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Components Tab */}
          {activeTab === 'components' && (
            <div className="tab-panel active">
              <h2>UI Components</h2>
              
              <h3>Buttons</h3>
              <div className="button-group">
                <button className="btn btn-primary">Primary Button</button>
                <button className="btn btn-secondary">Secondary</button>
                <button className="btn btn-ghost">Ghost</button>
                <button className="btn btn-danger">Danger</button>
                <button className="btn btn-primary" disabled>Disabled</button>
              </div>
              
              <h3>Panels & Cards</h3>
              <div className="panel-samples">
                <div className="panel panel-default">
                  <h4>Default Panel</h4>
                  <p>This is a default panel with standard styling.</p>
                </div>
                
                <div className="panel panel-elevated">
                  <h4>Elevated Panel</h4>
                  <p>This panel has elevation with shadow effects.</p>
                </div>
                
                <div className="glass-panel">
                  <h4>Glass Morphism Panel</h4>
                  <p>Modern glass effect with blur and transparency.</p>
                </div>
              </div>
              
              <h3>Progress & Loading</h3>
              <div className="progress-samples">
                <button onClick={simulateLoading} className="btn btn-primary">
                  {isLoading ? 'Loading...' : 'Trigger Loading'}
                </button>
                
                {isLoading && (
                  <div className="progress-indicator-demo">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '60%' }} />
                    </div>
                    <p className="progress-text">Processing... 60%</p>
                  </div>
                )}
              </div>
              
              <h3>Tooltips</h3>
              <div className="tooltip-samples">
                <div 
                  className="tooltip-trigger"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  Hover for tooltip
                  {showTooltip && (
                    <div className="tooltip tooltip-top">
                      This is a tooltip!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Forms Tab */}
          {activeTab === 'forms' && (
            <div className="tab-panel active">
              <h2>Form Elements</h2>
              
              <div className="form-samples">
                <div className="form-group">
                  <label>Text Input</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Enter text..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label>Dropdown</label>
                  <select className="dropdown">
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Range Slider</label>
                  <input type="range" className="slider" min="0" max="100" />
                </div>
                
                <div className="form-group">
                  <label>Checkbox</label>
                  <label className="checkbox-label">
                    <input type="checkbox" />
                    <span>Enable feature</span>
                  </label>
                </div>
                
                <div className="form-group">
                  <label>Radio Buttons</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input type="radio" name="option" />
                      <span>Option A</span>
                    </label>
                    <label className="radio-label">
                      <input type="radio" name="option" />
                      <span>Option B</span>
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Textarea</label>
                  <textarea 
                    className="textarea" 
                    placeholder="Enter multiple lines..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Canvas Tab */}
          {activeTab === 'canvas' && (
            <div className="tab-panel active">
              <h2>Canvas Elements</h2>
              
              <div className="canvas-samples">
                <div className="canvas-demo">
                  <div className="canvas-grid" />
                  <p>Canvas grid pattern</p>
                </div>
                
                <div className="minimap-demo">
                  <h4>Minimap</h4>
                  <div className="minimap">
                    <div className="minimap-viewport" />
                  </div>
                </div>
                
                <div className="toolbar-demo">
                  <h4>Toolbar</h4>
                  <div className="toolbar">
                    <button className="toolbar-btn"><Icon icon={Brush} size="base" /></button>
                    <button className="toolbar-btn"><Icon icon={Pencil} size="base" /></button>
                    <button className="toolbar-btn"><Icon icon={Search} size="base" /></button>
                    <button className="toolbar-btn"><Icon icon={Undo2} size="base" /></button>
                  </div>
                </div>
                
                <div className="context-menu-demo">
                  <h4>Context Menu</h4>
                  <div className="context-menu">
                    <div className="context-menu-item">Cut</div>
                    <div className="context-menu-item">Copy</div>
                    <div className="context-menu-item">Paste</div>
                    <div className="context-menu-divider" />
                    <div className="context-menu-item">Delete</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Shadow & Effects Showcase */}
      <div className="effects-showcase">
        <h2>Shadows & Effects</h2>
        <div className="shadow-grid">
          <div className="shadow-box shadow-sm">Shadow SM</div>
          <div className="shadow-box shadow-base">Shadow Base</div>
          <div className="shadow-box shadow-md">Shadow MD</div>
          <div className="shadow-box shadow-lg">Shadow LG</div>
          <div className="shadow-box shadow-xl">Shadow XL</div>
          <div className="shadow-box shadow-2xl">Shadow 2XL</div>
        </div>
      </div>
      
      {/* Animation Showcase */}
      <div className="animation-showcase">
        <h2>Animations</h2>
        <div className="animation-grid">
          <div className="animation-box fade-in">Fade In</div>
          <div className="animation-box slide-in">Slide In</div>
          <div className="animation-box scale-in">Scale In</div>
          <div className="animation-box spin">Spin</div>
        </div>
      </div>
    </div>
  )
}

export default ThemeTestPage
