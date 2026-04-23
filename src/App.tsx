import { useStore } from './store/useStore'
import { Layout } from './components/Layout'
import { TaskModal } from './components/TaskModal'
import { SettingsModal } from './components/SettingsModal'
import { CalendarPage } from './pages/CalendarPage'
import { KanbanPage } from './pages/KanbanPage'

export default function App() {
  const view = useStore((s) => s.ui.view)
  const isTaskModalOpen = useStore((s) => s.ui.isTaskModalOpen)
  const isSettingsOpen = useStore((s) => s.ui.isSettingsOpen)

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Layout>
        {view === 'calendar' ? <CalendarPage /> : <KanbanPage />}
      </Layout>
      {isTaskModalOpen && <TaskModal />}
      {isSettingsOpen && <SettingsModal />}
    </div>
  )
}
