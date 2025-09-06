import { render } from 'preact'
import { ThemeProvider } from './themes'
import { App } from './app'

// Import the new theme styles
import './themes/styles/token-variables.css'
import './themes/styles/reset.css'
import './themes/styles/global.css'
import './themes/styles/utilities.css'
import './themes/styles/layout.css'

// Import component-specific theme styles
import './themes/styles/components/buttons.css'
import './themes/styles/components/panels.css'
import './themes/styles/components/headers.css'
import './themes/styles/components/toolbars.css'
import './themes/styles/components/canvas.css'
import './themes/styles/components/inputs.css'

// Import legacy styles temporarily (will be removed after full migration)
import './styles/main.css'

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
