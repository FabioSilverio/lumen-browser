# Casa Flow

Aplicação web em **React + TypeScript + Vite**, pensada primeiro para **celular**: calendário semanal com grade de horários, quadro em colunas (estilo Trello) e tarefas domésticas com **ícones por tipo**, **anotações** e **lembretes**.

## Funcionalidades

- **Calendário**: semana começando na segunda; blocos proporcionais à duração; toque para editar.
- **Quadro**: arrastar cartões entre *A fazer*, *Fazendo* e *Feito*.
- **Lembretes**: data/hora opcional por tarefa + notificação do navegador (pede permissão em Ajustes).
- **WhatsApp**: em Ajustes cadastre o número (com DDI). Nos cartões e no editor, o botão abre `wa.me` com mensagem pronta para a pessoa enviar (o site não envia sozinho).

Os dados ficam no **localStorage** do navegador.

## Como rodar

```bash
npm install
npm run dev
```

Build estático:

```bash
npm run typecheck
npm run build
```

A pasta `dist/` pode ser publicada em qualquer hospedagem estática.

## Licença

MIT
