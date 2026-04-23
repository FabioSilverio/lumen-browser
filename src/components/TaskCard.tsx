import { Clock, MessageCircle, Trash2, MoreVertical, Check, Circle } from 'lucide-react'
import { useState } from 'react'
import type { Task } from '../types'
import { useStore } from '../store/useStore'
import { CATEGORIES, PRIORITIES } from '../utils/categories'
import { buildWhatsAppLink, buildReminderMessage } from '../utils/date'

interface TaskCardProps {
  task: Task
  compact?: boolean
}

export function TaskCard({ task, compact = false }: TaskCardProps) {
  const openEditTask = useStore((s) => s.openEditTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const toggleTaskStatus = useStore((s) => s.toggleTaskStatus)
  const settings = useStore((s) => s.settings)
  const [menuOpen, setMenuOpen] = useState(false)

  const cat = CATEGORIES[task.category]
  const pri = PRIORITIES[task.priority]

  function handleWhatsApp(e: React.MouseEvent) {
    e.stopPropagation()
    const phone = task.whatsappPhone || settings.spousePhone
    if (!phone) return
    const msg = buildReminderMessage(
      task.title,
      task.date,
      task.startTime,
      task.assignee || settings.spouseName,
      task.notes,
    )
    window.open(buildWhatsAppLink(phone, msg), '_blank')
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm('Excluir esta tarefa?')) deleteTask(task.id)
    setMenuOpen(false)
  }

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    toggleTaskStatus(task.id)
  }

  if (compact) {
    return (
      <div
        onClick={() => openEditTask(task.id)}
        className={`rounded-xl px-2 py-1.5 cursor-pointer active:opacity-70 transition-all ${cat.bg} border-l-4`}
        style={{ borderLeftColor: `var(--color-${task.category}, #c026d3)` }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{cat.emoji}</span>
          <p className={`text-xs font-semibold truncate flex-1 ${task.status === 'concluido' ? 'line-through opacity-60' : 'text-gray-800'}`}>
            {task.title}
          </p>
          {task.startTime && (
            <span className="text-[10px] text-gray-500 shrink-0">{task.startTime}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`card p-3.5 cursor-pointer active:scale-[0.98] transition-all relative ${
        task.status === 'concluido' ? 'opacity-60' : ''
      }`}
      onClick={() => openEditTask(task.id)}
    >
      {/* Priority dot */}
      <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${pri.dot}`} />

      <div className="flex items-start gap-3">
        {/* Check toggle */}
        <button
          onClick={handleToggle}
          className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            task.status === 'concluido'
              ? 'bg-green-500 border-green-500 text-white'
              : task.status === 'em_andamento'
              ? 'bg-brand-500 border-brand-500 text-white'
              : 'border-gray-300 hover:border-brand-400'
          }`}
        >
          {task.status === 'concluido' ? (
            <Check size={10} strokeWidth={3} />
          ) : task.status === 'em_andamento' ? (
            <Circle size={8} />
          ) : null}
        </button>

        <div className="flex-1 min-w-0">
          {/* Category tag */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-base">{cat.emoji}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wide ${cat.color}`}>
              {cat.label}
            </span>
          </div>

          {/* Title */}
          <p className={`font-semibold text-sm text-gray-900 leading-snug ${task.status === 'concluido' ? 'line-through' : ''}`}>
            {task.title}
          </p>

          {/* Description excerpt */}
          {task.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2">
            {task.startTime && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock size={11} />
                {task.startTime}{task.endTime ? ` – ${task.endTime}` : ''}
              </span>
            )}
            {task.assignee && (
              <span className="text-xs text-gray-400">👤 {task.assignee}</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50">
        <span className={`text-[10px] font-bold uppercase tracking-wide ${pri.color}`}>
          {pri.label}
        </span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {(task.whatsappPhone || settings.spousePhone) && (
            <button
              onClick={handleWhatsApp}
              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-all"
              title="Enviar no WhatsApp"
            >
              <MessageCircle size={15} />
            </button>
          )}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-all"
            >
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 bottom-8 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[130px] animate-fade-in">
                <button
                  onClick={(e) => { e.stopPropagation(); openEditTask(task.id); setMenuOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
