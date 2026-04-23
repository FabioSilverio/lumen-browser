import { Calendar, Kanban, Plus } from 'lucide-react'
import { useStore } from '../store/useStore'

export function BottomNav() {
  const view = useStore((s) => s.ui.view)
  const setView = useStore((s) => s.setView)
  const openNewTask = useStore((s) => s.openNewTask)

  return (
    <nav className="bg-white border-t border-gray-100 shadow-[0_-1px_10px_rgba(0,0,0,0.06)] safe-area-bottom z-30">
      <div className="flex items-center justify-around px-4 pt-2 pb-safe">
        <button
          onClick={() => setView('kanban')}
          className={`flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-2xl transition-all ${
            view === 'kanban'
              ? 'text-brand-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Kanban size={22} strokeWidth={view === 'kanban' ? 2.5 : 1.8} />
          <span className="text-[10px] font-semibold">Tarefas</span>
        </button>

        {/* FAB */}
        <button
          onClick={() => openNewTask()}
          className="flex flex-col items-center gap-0.5 -mt-5"
        >
          <div className="w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-300 active:scale-95 transition-all">
            <Plus size={28} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-semibold text-brand-600 mt-0.5">Adicionar</span>
        </button>

        <button
          onClick={() => setView('calendar')}
          className={`flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-2xl transition-all ${
            view === 'calendar'
              ? 'text-brand-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Calendar size={22} strokeWidth={view === 'calendar' ? 2.5 : 1.8} />
          <span className="text-[10px] font-semibold">Calendário</span>
        </button>
      </div>
    </nav>
  )
}
