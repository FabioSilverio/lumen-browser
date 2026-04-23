import { useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useStore } from '../store/useStore'
import { getWeekDays, fromISODate, isSameDayStr, toISODate } from '../utils/date'
import { HOURS } from '../utils/date'
import { CATEGORY_COLORS } from '../utils/categories'
import { TaskCard } from '../components/TaskCard'
import type { Task } from '../types'

const HOUR_HEIGHT = 56 // px per hour slot

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function taskTop(task: Task): number {
  if (!task.startTime) return 0
  return (timeToMinutes(task.startTime) / 60) * HOUR_HEIGHT
}

function taskHeight(task: Task): number {
  if (!task.startTime || !task.endTime) return HOUR_HEIGHT / 2
  const dur = timeToMinutes(task.endTime) - timeToMinutes(task.startTime)
  return Math.max((dur / 60) * HOUR_HEIGHT, 24)
}

export function CalendarPage() {
  const settings = useStore((s) => s.settings)
  const tasks = useStore((s) => s.tasks)
  const currentWeekDate = useStore((s) => s.ui.currentWeekDate)
  const calendarMode = useStore((s) => s.ui.calendarMode)
  const selectedDate = useStore((s) => s.ui.selectedDate)
  const openNewTask = useStore((s) => s.openNewTask)
  const setSelectedDate = useStore((s) => s.setSelectedDate)
  const setCalendarMode = useStore((s) => s.setCalendarMode)

  const scrollRef = useRef<HTMLDivElement>(null)

  const refDate = fromISODate(currentWeekDate)
  const weekDays = getWeekDays(refDate, settings.weekStartsOn)

  const displayDays = calendarMode === 'week' ? weekDays : [fromISODate(selectedDate)]

  // Scroll to 7am on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT
    }
  }, [])

  function handleCellClick(day: Date, hour: number) {
    const dateStr = toISODate(day)
    const timeStr = `${String(hour).padStart(2, '0')}:00`
    setSelectedDate(dateStr)
    openNewTask(dateStr, timeStr)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day-mode toggle + day headers */}
      <div className="bg-white border-b border-gray-100 px-2 pt-1 pb-0 shrink-0">
        {/* Mode tabs */}
        <div className="flex gap-1 mb-2 px-2">
          <button
            onClick={() => setCalendarMode('week')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              calendarMode === 'week'
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setCalendarMode('day')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              calendarMode === 'day'
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            Dia
          </button>
        </div>

        {/* Day headers */}
        <div className="flex">
          {/* gutter */}
          <div className="w-10 shrink-0" />
          {weekDays.map((day) => {
            const isSelected = toISODate(day) === selectedDate
            const dayTasks = tasks.filter((t) => isSameDayStr(t.date, day))
            const today = toISODate(new Date()) === toISODate(day)
            return (
              <button
                key={day.toISOString()}
                onClick={() => { setSelectedDate(toISODate(day)); setCalendarMode('day') }}
                className={`flex-1 flex flex-col items-center py-1 rounded-xl mx-0.5 transition-all ${
                  isSelected && calendarMode === 'day'
                    ? 'bg-brand-600 text-white'
                    : today
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-[10px] font-semibold uppercase">
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className="text-base font-bold leading-tight">{format(day, 'd')}</span>
                {/* dot indicator */}
                {dayTasks.length > 0 && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    isSelected && calendarMode === 'day' ? 'bg-white/70' : 'bg-brand-400'
                  }`} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full">
          {/* Hour labels */}
          <div className="w-10 shrink-0 border-r border-gray-100">
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex items-start justify-end pr-2 border-b border-gray-50"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="text-[10px] text-gray-400 mt-1 font-medium">
                  {String(h).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {displayDays.map((day) => {
            const dateStr = toISODate(day)
            const dayTasks = tasks.filter((t) => isSameDayStr(t.date, day))
            const timedTasks = dayTasks.filter((t) => t.startTime)
            const allDayTasks = dayTasks.filter((t) => !t.startTime)

            return (
              <div key={dateStr} className="flex-1 relative border-r border-gray-50 last:border-r-0">
                {/* Hour cells (click to add) */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="border-b border-gray-50 hover:bg-brand-50/30 cursor-pointer transition-colors time-grid-row"
                    style={{ height: HOUR_HEIGHT }}
                    onClick={() => handleCellClick(day, h)}
                  />
                ))}

                {/* Current time line */}
                {toISODate(day) === toISODate(new Date()) && (
                  <CurrentTimeLine />
                )}

                {/* Timed tasks */}
                {timedTasks.map((task) => (
                  <TimedTaskChip key={task.id} task={task} />
                ))}

                {/* All-day tasks (stacked at top of first hour) */}
                {allDayTasks.length > 0 && (
                  <div className="absolute top-1 left-1 right-1 flex flex-col gap-0.5 z-10">
                    {allDayTasks.slice(0, 3).map((t) => (
                      <MiniTaskChip key={t.id} task={t} />
                    ))}
                    {allDayTasks.length > 3 && (
                      <div className="text-[10px] text-gray-400 text-center">
                        +{allDayTasks.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Day view task list (below grid for untimed tasks) */}
      {calendarMode === 'day' && (
        <DayTaskList date={selectedDate} tasks={tasks.filter((t) => isSameDayStr(t.date, fromISODate(selectedDate)))} />
      )}
    </div>
  )
}

function CurrentTimeLine() {
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const top = (minutes / 60) * HOUR_HEIGHT
  return (
    <div
      className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
      style={{ top }}
    >
      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
      <div className="flex-1 h-[1.5px] bg-red-400" />
    </div>
  )
}

function TimedTaskChip({ task }: { task: Task }) {
  const openEditTask = useStore((s) => s.openEditTask)
  const color = CATEGORY_COLORS[task.category] || '#c026d3'
  const top = taskTop(task)
  const height = taskHeight(task)

  return (
    <div
      className="absolute left-1 right-1 rounded-lg px-1.5 py-1 overflow-hidden z-10 cursor-pointer active:opacity-70 transition-all"
      style={{
        top,
        height,
        backgroundColor: color + '22',
        borderLeft: `3px solid ${color}`,
      }}
      onClick={() => openEditTask(task.id)}
    >
      <p className="text-[11px] font-bold truncate" style={{ color }}>
        {task.title}
      </p>
      {height > 36 && (
        <p className="text-[10px] text-gray-500 truncate">{task.startTime} – {task.endTime || '?'}</p>
      )}
    </div>
  )
}

function MiniTaskChip({ task }: { task: Task }) {
  const openEditTask = useStore((s) => s.openEditTask)
  const color = CATEGORY_COLORS[task.category] || '#c026d3'
  return (
    <div
      className="rounded px-1 py-0.5 cursor-pointer active:opacity-70 overflow-hidden"
      style={{ backgroundColor: color + '22', borderLeft: `2px solid ${color}` }}
      onClick={() => openEditTask(task.id)}
    >
      <p className="text-[10px] font-semibold truncate" style={{ color }}>{task.title}</p>
    </div>
  )
}

function DayTaskList({ date, tasks }: { date: string; tasks: Task[] }) {
  const openNewTask = useStore((s) => s.openNewTask)
  if (tasks.length === 0) {
    return (
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
        <p className="text-sm text-gray-400">Nenhuma tarefa neste dia</p>
        <button onClick={() => openNewTask(date)} className="btn-primary py-1.5 px-3 text-xs">
          + Adicionar
        </button>
      </div>
    )
  }
  return (
    <div className="bg-white border-t border-gray-100 max-h-52 overflow-y-auto shrink-0">
      <div className="px-3 py-2 border-b border-gray-50 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
          📋 Tarefas do dia ({tasks.length})
        </span>
        <button onClick={() => openNewTask(date)} className="text-xs font-semibold text-brand-600">
          + Nova
        </button>
      </div>
      <div className="p-3 flex flex-col gap-2">
        {tasks.map((t) => <TaskCard key={t.id} task={t} compact />)}
      </div>
    </div>
  )
}
