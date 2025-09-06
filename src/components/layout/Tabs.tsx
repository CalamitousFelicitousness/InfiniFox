import { useRef } from 'preact/hooks'

interface Tab {
  id: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  setActiveTab: (id: string) => void
}

export function Tabs({ tabs, activeTab, setActiveTab }: TabsProps) {
  const tabsRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
        break
      case 'ArrowRight':
        e.preventDefault()
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0
        break
      case 'Home':
        e.preventDefault()
        newIndex = 0
        break
      case 'End':
        e.preventDefault()
        newIndex = tabs.length - 1
        break
      default:
        return
    }

    setActiveTab(tabs[newIndex].id)
    // Focus the new tab
    const buttons = tabsRef.current?.querySelectorAll('button')
    buttons?.[newIndex]?.focus()
  }

  return (
    <div class="tabs" ref={tabsRef} role="tablist">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          class={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault()
            setActiveTab(tab.id)
          }}
          onKeyDown={(e) => handleKeyDown(e, index)}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
