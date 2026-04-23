import { Bell, X } from "lucide-react";
import type { AppSettings } from "../types";
import { ensureNotificationPermission } from "../lib/reminders";

type Props = {
  open: boolean;
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onClose: () => void;
};

export function SettingsPanel({ open, settings, onChange, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h3>Ajustes</h3>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="sheet-body">
          <div className="field">
            <label htmlFor="wa">WhatsApp da pessoa (com DDI)</label>
            <input
              id="wa"
              inputMode="tel"
              placeholder="Ex.: 5511999998888"
              value={settings.spouseWhatsapp}
              onChange={(e) => onChange({ ...settings, spouseWhatsapp: e.target.value })}
            />
            <p className="hint">Só números. Usamos isso para abrir o wa.me com a mensagem pronta.</p>
          </div>
          <div className="field">
            <label htmlFor="nm">Nome nas mensagens</label>
            <input
              id="nm"
              placeholder="Ex.: amor"
              value={settings.spouseName}
              onChange={(e) => onChange({ ...settings, spouseName: e.target.value })}
            />
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={async () => {
              const p = await ensureNotificationPermission();
              if (p === "granted") {
                new Notification("Casa Flow", { body: "Lembretes ativados neste aparelho.", lang: "pt-BR" });
              }
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Bell size={16} /> Permitir notificações
            </span>
          </button>
          <p className="hint">
            O WhatsApp não envia sozinho a partir deste site: o botão abre uma conversa com o texto já escrito para a
            pessoa enviar. Os lembretes locais funcionam com o app aberto ou minimizado conforme o navegador.
          </p>
        </div>
      </div>
    </div>
  );
}
