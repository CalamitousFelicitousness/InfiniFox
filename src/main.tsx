import 'preact/debug'
import { render } from 'preact'

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
const root = document.getElementById('app')

if (root) {
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
    root
  )
}
