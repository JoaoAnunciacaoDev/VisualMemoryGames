# VisualMemory Frontend

Frontend React + TypeScript servido pelo Vite e gerenciado com Bun.

## Stack

- TanStack Router com roteamento tipado baseado em arquivos
- TanStack Query para cache e sincronização do estado do servidor
- TanStack Form e Zod para formulários e validação nas fronteiras
- Tailwind CSS 4 para layout e estilos reutilizáveis
- CSS Modules para animações e estilos específicos já existentes
- Lucide React para ícones de interface e React Icons para marcas oficiais
- Vitest e Testing Library para testes unitários
- Playwright em Chromium, Firefox e WebKit, com auditoria de acessibilidade e regressão visual

As rotas são carregadas sob demanda. Filtros relevantes permanecem na URL para permitir navegação e compartilhamento, enquanto valores padrão são removidos para mantê-la compacta.

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

## Organização

```text
src/
├── app/         # Router, QueryClient, validação de buscas e guards
├── components/  # Componentes reutilizáveis e específicos de domínio
├── features/    # Queries e regras de acesso a dados por domínio
├── hooks/       # Hooks de estado e integração
├── pages/       # Composição das telas
├── providers/   # Autenticação e notificações
├── routes/      # Rotas tipadas baseadas em arquivos
├── services/    # Cliente HTTP e integrações
├── styles/      # Tokens e estilos globais
└── test/        # Testes unitários e de integração
```

## Próximas otimizações

- Benchmark com Lighthouse e Core Web Vitals.
- Imagens responsivas, formatos modernos e carregamento tardio.
- Virtualização de listas extensas.
- Análise e redução contínua do bundle.
- Maior cobertura E2E para fluxos críticos e dispositivos móveis.
