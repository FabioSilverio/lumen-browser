# 🏠 Casa Agenda

Aplicativo web progressivo (PWA) para gerenciamento de tarefas domésticas, com calendário semanal e vista Kanban estilo Trello.

## Funcionalidades

- **📅 Calendário semanal** com grade de horários (00h–23h), vista por dia e semana
- **📋 Kanban** estilo Trello com colunas: *A Fazer*, *Em Andamento*, *Concluído* — com drag & drop
- **✨ 11 categorias domésticas** com emoji: Limpeza, Cozinha, Compras, Manutenção, Crianças, Pets, Jardim, Roupa, Finanças, Saúde, Outros
- **⚡ Prioridades** com código de cores: Baixa, Média, Alta, Urgente
- **💚 Integração WhatsApp** — gera link `wa.me` com mensagem pronta para enviar lembretes à esposa
- **🔁 Recorrência** — Diária, Semanal, Mensal
- **📝 Anotações** por tarefa
- **💾 Persistência local** via `localStorage` (dados não saem do dispositivo)
- **📤 Exportar backup** em JSON
- **📱 100% responsivo** — otimizado para mobile

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173) no navegador.

## Build para produção

```bash
npm run build
npm run preview
```

## Configuração inicial

1. Clique no ícone ⚙️ no canto superior direito
2. Preencha seu nome e o nome da esposa
3. Informe o número de WhatsApp com código do país (ex: `5511987654321`)
4. Salve e pronto!

## Como enviar lembretes no WhatsApp

Ao criar ou editar uma tarefa, clique em **"Enviar Lembrete no WhatsApp"**. O app abrirá o WhatsApp com uma mensagem já formatada com todos os detalhes da tarefa. Basta enviar!

## Tecnologias

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- Zustand (state management)
- date-fns (datas em PT-BR)
- lucide-react (ícones)
