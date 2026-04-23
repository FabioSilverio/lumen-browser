import { useState } from 'react'
import { X, Save, Trash2, Download } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { AppSettings } from '../types'

export function SettingsModal() {
  const settings = useStore((s) => s.settings)
  const tasks = useStore((s) => s.tasks)
  const updateSettings = useStore((s) => s.updateSettings)
  const closeSettings = useStore((s) => s.closeSettings)

  const [form, setForm] = useState<AppSettings>({ ...settings })

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    updateSettings(form)
    closeSettings()
  }

  function handleExport() {
    const data = JSON.stringify({ tasks, settings }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `casa-agenda-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleClearDone() {
    if (confirm('Excluir todas as tarefas concluídas?')) {
      const store = useStore.getState()
      const toDelete = tasks.filter((t) => t.status === 'concluido').map((t) => t.id)
      toDelete.forEach((id) => store.deleteTask(id))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeSettings} />

      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">⚙️ Configurações</h2>
          <button onClick={closeSettings} className="btn-ghost p-2">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Profile */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">👤 Perfil</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Meu nome</label>
                <input
                  className="input"
                  value={form.myName}
                  onChange={(e) => set('myName', e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="label">Nome da esposa / parceira</label>
                <input
                  className="input"
                  value={form.spouseName}
                  onChange={(e) => set('spouseName', e.target.value)}
                  placeholder="Nome dela"
                />
              </div>
            </div>
          </section>

          {/* WhatsApp */}
          <section>
            <h3 className="text-xs font-bold text-green-600 uppercase tracking-wide mb-3">💚 WhatsApp</h3>
            <div className="bg-green-50 rounded-2xl p-3.5 border border-green-100">
              <label className="label text-green-700">Número padrão (com código do país)</label>
              <input
                className="input"
                value={form.spousePhone}
                onChange={(e) => set('spousePhone', e.target.value)}
                placeholder="5511999999999"
                type="tel"
              />
              <p className="text-[11px] text-gray-500 mt-2">
                Formato: <strong>55</strong> (Brasil) + DDD + número. Ex: <strong>5511987654321</strong>
              </p>
              {form.spousePhone && (
                <a
                  href={`https://wa.me/${form.spousePhone.replace(/\D/g, '')}?text=Ol%C3%A1!%20Estou%20testando%20o%20Casa%20Agenda%20%F0%9F%8F%A0`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-green-600 underline"
                >
                  Testar número no WhatsApp ↗
                </a>
              )}
            </div>
          </section>

          {/* Calendar */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">📅 Calendário</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Início da semana</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => set('weekStartsOn', 0)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      form.weekStartsOn === 0
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    Domingo
                  </button>
                  <button
                    onClick={() => set('weekStartsOn', 1)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      form.weekStartsOn === 1
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    Segunda
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Vista padrão</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => set('defaultView', 'kanban')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      form.defaultView === 'kanban'
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    📋 Kanban
                  </button>
                  <button
                    onClick={() => set('defaultView', 'calendar')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      form.defaultView === 'calendar'
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    📅 Calendário
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Reminders */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">🔔 Lembretes</h3>
            <div>
              <label className="label">Lembrete padrão (minutos antes)</label>
              <select
                className="input"
                value={form.reminderDefault}
                onChange={(e) => set('reminderDefault', Number(e.target.value))}
              >
                <option value={0}>Na hora</option>
                <option value={15}>15 minutos antes</option>
                <option value={30}>30 minutos antes</option>
                <option value={60}>1 hora antes</option>
                <option value={120}>2 horas antes</option>
                <option value={1440}>1 dia antes</option>
              </select>
            </div>
          </section>

          {/* Data management */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">🗂️ Dados</h3>
            <div className="space-y-2">
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                📊 {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} salva{tasks.length !== 1 ? 's' : ''}
                {' · '}
                ✅ {tasks.filter((t) => t.status === 'concluido').length} concluída{tasks.filter((t) => t.status === 'concluido').length !== 1 ? 's' : ''}
              </div>
              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                <Download size={16} />
                Exportar Backup (JSON)
              </button>
              <button
                onClick={handleClearDone}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-all"
              >
                <Trash2 size={16} />
                Limpar tarefas concluídas
              </button>
            </div>
          </section>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={closeSettings} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={handleSave} className="btn-primary flex-1">
            <Save size={16} />
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
