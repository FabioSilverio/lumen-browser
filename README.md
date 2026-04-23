# Casa Flow Planner

Casa Flow Planner e uma SPA React mobile-first para organizar afazeres domesticos com tres visoes principais:

- **Resumo** com metricas, proximos afazeres e categorias com icones
- **Agenda semanal** com dias da semana e horario em formato de cronograma
- **Quadro estilo Trello** para mover tarefas entre `Para combinar`, `Planejado`, `Em andamento` e `Concluido`

A interface ja nasce pronta para uso em navegador e deploy web, com persistencia local em `localStorage`.

## Recursos principais

- cadastro de tarefas domesticas com titulo, categoria, prioridade, responsavel, horario, local e anotacoes
- icones visuais para cozinha, limpeza, roupa, pets, manutencao e outros contextos da casa
- calendario semanal com grade horaria para visualizar compromissos e afazeres
- board estilo Kanban/Trello para acompanhar andamento das tarefas
- atalho de lembrete para WhatsApp com mensagem pronta para a esposa
- suporte a tema claro/escuro
- layout adaptado para mobile e desktop
- manifesto web basico para experiencia de app instalada no celular

## Lembretes no WhatsApp

A versao atual abre um link/mensagem pronta no WhatsApp, o que funciona bem para web e celular sem backend.

Se voce quiser **envio automatico real**, o proximo passo tecnico e integrar com:

- WhatsApp Business Platform
- Twilio WhatsApp API
- ou um backend proprio com fila/agendamento

## Rodando localmente

```bash
npm install
npm run dev
```

## Build web

```bash
npm run build:web
```

Saida gerada em:

```bash
dist/renderer
```

## Deploy recomendado

**Vercel** e a melhor opcao para este projeto hoje porque:

- deploy de SPA Vite e direto
- previews por branch/PR facilitam iteracao de UI
- configuracao simples para evoluir depois com funcoes serverless ou backend de lembretes
- menos atrito que GitHub Pages para ajustes futuros de dominio, previews e integracoes

Ja deixei um `vercel.json` no repo apontando para o build web.
