export type BoardColumnId = "todo" | "doing" | "done";

export type ChoreKind =
  | "limpeza"
  | "cozinha"
  | "compras"
  | "roupa"
  | "manutencao"
  | "plantas"
  | "pets"
  | "organizacao"
  | "outro";

export type Chore = {
  id: string;
  title: string;
  notes: string;
  kind: ChoreKind;
  column: BoardColumnId;
  /** Início do bloco no calendário (ISO local) */
  start: string;
  /** Duração em minutos (múltiplo de 15) */
  durationMin: number;
  /** Lembrete no dispositivo (ISO) — opcional */
  remindAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppSettings = {
  /** Apenas dígitos, com DDI, ex: 5511999998888 */
  spouseWhatsapp: string;
  /** Nome curto pra mensagens */
  spouseName: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  spouseWhatsapp: "",
  spouseName: "amor"
};
