import { Settings, Plus, ChevronLeft, ChevronRight, Calendar, Kanban } from 'lucide-react'
import { useStore } from '../store/useStore'
import { formatDisplay, fromISODate, getWeekDays } from '../utils/date'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function TopBar() {
  const view = useStore((s) => s.ui.view)
  const calendarMode = useStore((s) => s.ui.calendarMode)
  const currentWeekDate = useStore((s) => s.ui.currentWeekDate)
  const settings = useStore((s) => s.settings)
  const openSettings = useStore((s) => s.openSettings)
  const openNewTask = useStore((s) => s.openNewTask)
  const goToNextWeek = useStore((s) => s.goToNextWeek)
  const goToPrevWeek = useStore((s) => s.goToPrevWeek)
  const goToToday = useStore((s) => s.goToToday)
  const setView = useStore((s) => s.setView)

  const refDate = fromISODate(currentWeekDate)
  const weekDays = getWeekDays(refDate, settings.weekStartsOn)
  const weekLabel =
    calendarMode === 'week' && view === 'calendar'
      ? `${format(weekDays[0], 'd MMM', { locale: ptBR })} – ${format(weekDays[6], 'd MMM yyyy', { locale: ptBR })}`
      : formatDisplay(refDate, "MMMM 'de' yyyy")

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl">🏠</span>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight">Casa Agenda</h1>
            <p className="text-xs text-gray-400 truncate">
              {view === 'calendar' ? '📅 Calendário' : '📋 Tarefas'}
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setView('kanban')}
            className={`p-1.5 rounded-lg transition-all ${
              view === 'kanban' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500'
            }`}
            title="Kanban"
          >
            <Kanban size={16} />
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`p-1.5 rounded-lg transition-all ${
              view === 'calendar' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500'
            }`}
            title="Calendário"
          >
            <Calendar size={16} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {view === 'calendar' && (
            <>
              <button onClick={goToPrevWeek} className="btn-ghost p-2">
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goToToday}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50 transition-all"
              >
                Hoje
              </button>
              <button onClick={goToNextWeek} className="btn-ghost p-2">
                <ChevronRight size={18} />
              </button>
            </>
          )}
          <button onClick={() => openNewTask()} className="btn-primary px-3 py-2">
            <Plus size={16} />
            <span className="hidden sm:inline">Nova</span>
          </button>
          <button onClick={openSettings} className="btn-ghost p-2">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Calendar week label */}
      {view === 'calendar' && (
        <div className="px-4 pb-2 text-center">
          <span className="text-xs font-medium text-gray-500 capitalize">{weekLabel}</span>
        </div>
      )}
    </header>
  )
}
