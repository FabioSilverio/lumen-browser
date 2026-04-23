import { useState } from 'react'
import { X, MessageCircle, Trash2, Save, ExternalLink } from 'lucide-react'
import { useStore } from '../store/useStore'
import { CATEGORIES, PRIORITIES, STATUS_META } from '../utils/categories'
import { buildWhatsAppLink, buildReminderMessage } from '../utils/date'
import type { Task, TaskCategory, TaskPriority, TaskStatus, RecurrenceType } from '../types'
import { toISODate, todayDate } from '../utils/date'

const DEFAULT_TASK: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  description: '',
  category: 'limpeza',
  priority: 'media',
  status: 'pendente',
  date: toISODate(todayDate()),
  startTime: '',
  endTime: '',
  reminder: 30,
  recurrence: 'none',
  notes: '',
  assignee: '',
  whatsappPhone: '',
}

export function TaskModal() {
  const editingTaskId = useStore((s) => s.ui.editingTaskId)
  const defaultDate = useStore((s) => s.ui.defaultNewTaskDate)
  const defaultTime = useStore((s) => s.ui.defaultNewTaskTime)
  const tasks = useStore((s) => s.tasks)
  const settings = useStore((s) => s.settings)
  const addTask = useStore((s) => s.addTask)
  const updateTask = useStore((s) => s.updateTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const closeModal = useStore((s) => s.closeTaskModal)

  const existingTask = editingTaskId ? tasks.find((t) => t.id === editingTaskId) : null

  const [form, setForm] = useState<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>(() => {
    if (existingTask) {
      const { id, createdAt, updatedAt, ...rest } = existingTask
      return rest
    }
    return {
      ...DEFAULT_TASK,
      date: defaultDate ?? toISODate(todayDate()),
      startTime: defaultTime ?? '',
      assignee: settings.spouseName,
    }
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = 'Informe o título da tarefa'
    if (!form.date) errs.date = 'Informe a data'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    if (existingTask) {
      updateTask(existingTask.id, form)
    } else {
      addTask(form)
    }
    closeModal()
  }

  function handleDelete() {
    if (!existingTask) return
    if (confirm('Excluir esta tarefa?')) {
      deleteTask(existingTask.id)
      closeModal()
    }
  }

  function handleWhatsApp() {
    const phone = form.whatsappPhone || settings.spousePhone
    if (!phone) {
      alert('Configure o número de WhatsApp nas configurações ou preencha o campo acima.')
      return
    }
    const msg = buildReminderMessage(
      form.title || 'Tarefa sem título',
      form.date,
      form.startTime || undefined,
      form.assignee || settings.spouseName,
      form.notes,
    )
    window.open(buildWhatsAppLink(phone, msg), '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[94vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {existingTask ? '✏️ Editar Tarefa' : '✨ Nova Tarefa'}
          </h2>
          <div className="flex items-center gap-1">
            {existingTask && (
              <button onClick={handleDelete} className="btn-ghost p-2 text-red-500">
                <Trash2 size={17} />
              </button>
            )}
            <button onClick={closeModal} className="btn-ghost p-2">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="label">📌 Título *</label>
            <input
              className={`input ${errors.title ? 'ring-2 ring-red-400 border-red-300' : ''}`}
              placeholder="O que precisa fazer?"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              autoFocus
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Category grid */}
          <div>
            <label className="label">🏷️ Categoria</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(CATEGORIES) as TaskCategory[]).map((cat) => {
                const c = CATEGORIES[cat]
                return (
                  <button
                    key={cat}
                    onClick={() => set('category', cat)}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl border-2 transition-all text-center ${
                      form.category === cat
                        ? `border-brand-400 ${c.bg}`
                        : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-xl">{c.emoji}</span>
                    <span className="text-[10px] font-semibold text-gray-600 mt-0.5 leading-tight">
                      {c.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">⚡ Prioridade</label>
              <div className="flex flex-col gap-1">
                {(Object.keys(PRIORITIES) as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => set('priority', p)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                      form.priority === p
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${PRIORITIES[p].dot}`} />
                    {PRIORITIES[p].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">📋 Status</label>
              <div className="flex flex-col gap-1">
                {(Object.keys(STATUS_META) as TaskStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => set('status', s)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                      form.status === s
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    <span>{STATUS_META[s].emoji}</span>
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date + Times */}
          <div>
            <label className="label">📅 Data *</label>
            <input
              type="date"
              className={`input ${errors.date ? 'ring-2 ring-red-400 border-red-300' : ''}`}
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">🕐 Início</label>
              <input
                type="time"
                className="input"
                value={form.startTime ?? ''}
                onChange={(e) => set('startTime', e.target.value)}
              />
            </div>
            <div>
              <label className="label">🕕 Fim</label>
              <input
                type="time"
                className="input"
                value={form.endTime ?? ''}
                onChange={(e) => set('endTime', e.target.value)}
              />
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="label">🔁 Repetição</label>
            <div className="flex gap-2">
              {(['none', 'daily', 'weekly', 'monthly'] as RecurrenceType[]).map((r) => {
                const labels = { none: 'Nunca', daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' }
                return (
                  <button
                    key={r}
                    onClick={() => set('recurrence', r)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      form.recurrence === r
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-100 bg-gray-50 text-gray-600'
                    }`}
                  >
                    {labels[r]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">📝 Descrição</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Detalhes da tarefa..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="label">🗒️ Anotações</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Anote lembretes, links, produtos necessários..."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          {/* Assignee + WhatsApp */}
          <div className="bg-green-50 rounded-2xl p-3.5 border border-green-100">
            <label className="label text-green-700">💚 WhatsApp & Responsável</label>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Responsável</label>
                <input
                  className="input text-sm"
                  placeholder={settings.spouseName}
                  value={form.assignee ?? ''}
                  onChange={(e) => set('assignee', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Número WhatsApp (ex: 5511999999999)</label>
                <input
                  className="input text-sm"
                  placeholder={settings.spousePhone || '5511999999999'}
                  value={form.whatsappPhone ?? ''}
                  onChange={(e) => set('whatsappPhone', e.target.value)}
                />
              </div>
              <button
                onClick={handleWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 active:scale-95 transition-all"
              >
                <MessageCircle size={16} />
                Enviar Lembrete no WhatsApp
                <ExternalLink size={13} />
              </button>
              <p className="text-[10px] text-gray-400 text-center">
                Abrirá o WhatsApp com a mensagem pronta para enviar
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={closeModal} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={handleSave} className="btn-primary flex-1">
            <Save size={16} />
            {existingTask ? 'Salvar' : 'Criar Tarefa'}
          </button>
        </div>
      </div>
    </div>
  )
}
