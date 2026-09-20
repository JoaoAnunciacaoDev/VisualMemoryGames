# VisualMemory Frontend

Frontend React + TypeScript servido pelo Vite e gerenciado com Bun.

## Stack

- TanStack Router com roteamento tipado baseado em arquivos
- TanStack Query para cache e sincronização do estado do servidor
- TanStack Form e Zod para formulários e validação nas fronteiras
- Tailwind CSS 4 para layout e estilos reutilizáveis
- CSS Modules para animações e estilos específicos já existentes
- Lucide React para ícones
- Vitest e Testing Library para testes unitários
- Playwright em Chromium, Firefox e WebKit, com auditoria de acessibilidade e regressão visual

## Comandos

```bash
bun install --frozen-lockfile
bun run dev
bun run lint
bun run typecheck
bun run test
bun run build
bun run test:e2e
```

Configure `VITE_API_URL` para apontar para o backend. Sem essa variável, o frontend usa `http://localhost:8000`.
