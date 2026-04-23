import { useStore } from '../store/useStore'
import { formatDisplay, todayDate } from '../utils/date'

export function WelcomeBanner() {
  const settings = useStore((s) => s.settings)
  const tasks = useStore((s) => s.tasks)
  const openNewTask = useStore((s) => s.openNewTask)

  const today = formatDisplay(todayDate(), "EEEE, d 'de' MMMM")
  const pending = tasks.filter((t) => t.status !== 'concluido').length
  const done = tasks.filter((t) => t.status === 'concluido').length

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="bg-gradient-to-r from-brand-600 to-purple-600 rounded-2xl p-4 text-white mx-3 mt-3 mb-1">
      <p className="text-xs font-medium opacity-80 capitalize">{today}</p>
      <h2 className="text-lg font-bold mt-0.5">
        {greeting}, {settings.myName}! 👋
      </h2>
      <div className="flex items-center gap-4 mt-3">
        <div className="text-center">
          <p className="text-2xl font-extrabold">{pending}</p>
          <p className="text-[11px] opacity-80">pendentes</p>
        </div>
        <div className="w-px h-8 bg-white/30" />
        <div className="text-center">
          <p className="text-2xl font-extrabold">{done}</p>
          <p className="text-[11px] opacity-80">concluídas</p>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => openNewTask()}
          className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all rounded-xl px-4 py-2 text-sm font-bold"
        >
          + Nova
        </button>
      </div>
    </div>
  )
}
