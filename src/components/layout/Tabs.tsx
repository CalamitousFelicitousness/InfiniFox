import './Tabs.css'

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
  return (
    <div class="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          class={activeTab === tab.id ? 'active' : ''}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
