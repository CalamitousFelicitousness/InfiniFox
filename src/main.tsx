// Apply React 18 patches for react-konva compatibility
import './utils/reactPatches'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app'
import { ThemeProvider } from './themes'

// Import theme styles
import './themes/styles/token-variables.css'
import './themes/styles/reset.css'
import './themes/styles/global.css'
import './themes/styles/utilities.css'
import './themes/styles/layout.css'
import './themes/styles/icons.css'

// Import component-specific theme styles
import './themes/styles/components/buttons.css'
import './themes/styles/components/inputs.css'
import './themes/styles/components/panels.css'
import './themes/styles/components/glass.css'
import './themes/styles/components/floating-panels.css'
import './themes/styles/components/menus.css'
import './themes/styles/components/controls.css'
import './themes/styles/components/color-picker.css'
import './themes/styles/components/generation-panels.css'
import './themes/styles/components/toggles.css'
import './themes/styles/components/toolbars.css'
import './themes/styles/components/headers.css'
import './themes/styles/components/canvas.css'

// Root element
const container = document.getElementById('app')

if (container) {
  const root = createRoot(container)
  root.render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>
  )
}
