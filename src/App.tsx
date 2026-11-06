import { useState } from 'react'
import './App.css'

type DesktopTheme = 'mac' | 'windows'

function App() {
  const [theme, setTheme] = useState<DesktopTheme>('mac')

  return (
    <main
      className="desktop-background"
      data-theme={theme}
      aria-label={theme === 'mac' ? 'Mac light desktop' : 'Windows dark desktop'}
    >
      <div className="wallpaper" aria-hidden="true" />

      <div className="theme-switch" role="group" aria-label="Desktop theme">
        <button
          type="button"
          aria-pressed={theme === 'mac'}
          onClick={() => setTheme('mac')}
        >
          Mac · Light
        </button>
        <button
          type="button"
          aria-pressed={theme === 'windows'}
          onClick={() => setTheme('windows')}
        >
          Windows · Dark
        </button>
      </div>
    </main>
  )
}

export default App
