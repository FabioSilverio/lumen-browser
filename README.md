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

## Deploy na Vercel (recomendado)

1. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório GitHub.
2. Framework: **Vite** (detecção automática na maioria dos casos).
3. Build: `npm run build` · Output: `dist` (já definidos em `vercel.json`).
4. Após o merge na `main`, cada push em `main` gera um novo deploy.

Há também o workflow opcional `.github/workflows/vercel-deploy.yml`: ao configurar os secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` no GitHub, o deploy em produção roda em todo push na `main`.

## Licença

MIT
