import { useState } from 'react'
import { Plus, Filter } from 'lucide-react'
import { useStore } from '../store/useStore'
import { KANBAN_COLUMNS, CATEGORIES } from '../utils/categories'
import { TaskCard } from '../components/TaskCard'
import { WelcomeBanner } from '../components/WelcomeBanner'
import type { Task, TaskCategory, TaskStatus } from '../types'

const ALL_CATEGORIES = 'all' as const
type FilterCategory = TaskCategory | typeof ALL_CATEGORIES

export function KanbanPage() {
  const tasks = useStore((s) => s.tasks)
  const openNewTask = useStore((s) => s.openNewTask)
  const updateTask = useStore((s) => s.updateTask)
  const [filterCat, setFilterCat] = useState<FilterCategory>('all')
  const [showFilter, setShowFilter] = useState(false)

  const filtered = filterCat === 'all' ? tasks : tasks.filter((t) => t.category === filterCat)

  function getColumnTasks(status: TaskStatus): Task[] {
    return filtered
      .filter((t) => t.status === status)
      .sort((a, b) => {
        const pOrder = { urgente: 0, alta: 1, media: 2, baixa: 3 }
        return pOrder[a.priority] - pOrder[b.priority]
      })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <WelcomeBanner />
      {/* Filter bar */}
      <div className="bg-white border-b border-gray-100 px-3 py-2 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`btn-ghost py-1.5 gap-1.5 ${showFilter ? 'bg-brand-50 text-brand-600' : ''}`}
        >
          <Filter size={14} />
          <span className="text-xs font-semibold">Filtrar</span>
        </button>
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <CategoryPill
            active={filterCat === 'all'}
            onClick={() => setFilterCat('all')}
            label="Todas"
            emoji="🏠"
          />
          {(Object.keys(CATEGORIES) as TaskCategory[]).map((cat) => (
            <CategoryPill
              key={cat}
              active={filterCat === cat}
              onClick={() => setFilterCat(cat)}
              label={CATEGORIES[cat].label}
              emoji={CATEGORIES[cat].emoji}
            />
          ))}
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 h-full px-3 py-3" style={{ minWidth: 'max-content' }}>
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = getColumnTasks(col.id)
            return (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={colTasks}
                onAddTask={() => openNewTask()}
                onDropTask={(taskId) => updateTask(taskId, { status: col.id })}
              />
            )
          })}
        </div>
      </div>

      {/* Stats row */}
      <div className="bg-white border-t border-gray-100 px-4 py-2 flex items-center justify-around shrink-0">
        {KANBAN_COLUMNS.map((col) => {
          const count = getColumnTasks(col.id).length
          return (
            <div key={col.id} className="flex flex-col items-center">
              <span className="text-lg">{col.emoji}</span>
              <span className="text-base font-bold text-gray-800">{count}</span>
              <span className="text-[10px] text-gray-400">{col.title}</span>
            </div>
          )
        })}
        <div className="flex flex-col items-center">
          <span className="text-lg">📊</span>
          <span className="text-base font-bold text-gray-800">{filtered.length}</span>
          <span className="text-[10px] text-gray-400">Total</span>
        </div>
      </div>
    </div>
  )
}

interface KanbanColumnProps {
  column: (typeof KANBAN_COLUMNS)[number]
  tasks: Task[]
  onAddTask: () => void
  onDropTask: (taskId: string) => void
}

function KanbanColumn({ column, tasks, onAddTask, onDropTask }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId) onDropTask(taskId)
  }

  const colColors: Record<string, string> = {
    pendente: 'border-t-gray-400',
    em_andamento: 'border-t-brand-500',
    concluido: 'border-t-green-500',
  }

  return (
    <div
      className={`flex flex-col w-72 bg-gray-50 rounded-2xl border-t-4 ${colColors[column.id] ?? ''} transition-all ${
        isDragOver ? 'ring-2 ring-brand-300 bg-brand-50/50' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{column.emoji}</span>
          <span className="font-bold text-sm text-gray-700">{column.title}</span>
          <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button onClick={onAddTask} className="btn-ghost p-1.5">
          <Plus size={16} />
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-300">
            <span className="text-3xl mb-2">
              {column.id === 'pendente' ? '📭' : column.id === 'em_andamento' ? '💤' : '🎉'}
            </span>
            <p className="text-xs font-medium">
              {column.id === 'concluido' ? 'Nada concluído ainda' : 'Sem tarefas aqui'}
            </p>
          </div>
        )}
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}

function DraggableTaskCard({ task }: { task: Task }) {
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('taskId', task.id)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="cursor-grab active:cursor-grabbing active:opacity-60"
    >
      <TaskCard task={task} />
    </div>
  )
}

interface CategoryPillProps {
  active: boolean
  onClick: () => void
  label: string
  emoji: string
}

function CategoryPill({ active, onClick, label, emoji }: CategoryPillProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
        active
          ? 'bg-brand-600 text-white shadow-sm'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  )
}
