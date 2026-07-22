<h1 align="center">🎮 VisualMemory</h1>

<p align="center">
  <em>Plataforma para gestão de bibliotecas de videojogos, integração com a Steam e Itch.io e criação de tier lists personalizadas.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <br>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" />
  <img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" />
  <br>
  <img src="https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white" />
  <img src="https://img.shields.io/badge/Alembic-6C757D?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Pydantic-E92063?style=for-the-badge&logo=pydantic&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
</p>

---

# 🎯 Sobre o Projeto

O **VisualMemory** é uma aplicação moderna desenvolvida com uma arquitetura desacoplada. Consiste numa API RESTful de alto desempenho interligada a uma interface fluida, permitindo aos utilizadores pesquisar títulos reais, gerir as suas coleções, integrar contas públicas da Steam para importar jogos automaticamente e organizar jogos em *tier lists*.

---

# ✨ Funcionalidades

- 🔐 **Segurança & Autenticação:** Autenticação robusta com JWT (OAuth2) e rate limiting contra ataques de força bruta.
- 🛡️ **Painel Administrativo:**
  - Acesso restrito e protegido para administradores.
  - Board estatístico de saúde do sistema (Total de usuários, ativos, desativados, administradores).
  - Tabela gerencial de usuários com suporte a busca em tempo real.
  - Ações administrativas seguras: promover/rebaixar privilégios de admin, ativar/desativar contas e exclusão permanente com cascade completo de registros relacionados.
  - Script CLI (`manage_admin.py`) para promoção e rebaixamento de usuários com segurança diretamente pelo terminal.
- 🔗 **Integração com a Steam:** 
  - Vínculo de múltiplas contas Steam públicas por perfil de usuário.
  - Sincronização automatizada em segundo plano a cada nova sessão ou manual instantânea.
  - Detecção real de platinas (100% de conquistas obtidas) rodando chamadas em paralelo de forma otimizada.
  - Classificação inteligente de status inicial: *"Platinado"* para conquistas completas, *"Jogando"* para jogos iniciados nas últimas 2 semanas, e *"Quero Jogar"* para os demais.
- 🎨 **Visual Moderno de Capas:**
  - Badge dinâmico com o ícone e nome da loja (ex: `🎮 Steam`, `PlayStation Store`, `Xbox Store`) sobreposto nos cards da biblioteca.
  - Indicador de estrela dourada (`⭐`) no topo direito para os jogos favoritados.
  - Emojis descritivos integrados nos GameCards da biblioteca (📝 Nota, ✅ Ano de Conclusão, 🏆 Ano de Platina) para maior legibilidade visual.
- 🔍 **Pesquisa e Cadastro Inteligente:**
  - Pesquisa integrada com a API oficial da RAWG.
- 📝 **Múltiplas Avaliações (Histórico/Timeline):**
  - Registro de múltiplos comentários textuais e notas por jogo para acompanhar a mudança de opinião em novas jogatinas.
  - Exibição em linha do tempo conectada (Timeline Feed) com renderização de Markdown.
- 🚀 **Motor de Recomendações Otimizado:**
  - Carregamento instantâneo via cache local no banco de dados.
  - Exclusão robusta de jogos já contidos na biblioteca (comparando IDs internos e externos).
  - Variedade aprimorada com paginação aleatória nas consultas RAWG.
- 📊 **Social, Feed & Lançamentos:**
  - Filtro dropdown por mês e ano para consultar o Feed de Atividades de forma segmentada dos usuários que você segue.
  - Painel lateral de Lançamentos da Semana integrado ao RAWG com filtro inteligente dinâmico contra escassez de lançamentos populares.
- 📊 **Painel de Perfil Avançado (Dashboard):**
  - Board estatístico interativo para ver jogos concluídos no ano filtrados por mês, contendo contador de jogos zerados e grade de capas correspondentes.
  - Histórico de conclusões anual colapsável em acordeões (`▶` / `▼`) para otimização de espaço.
  - Responsividade total para telas móveis e desktop (nome de usuário e menus centralizados no mobile).
- ⚙️ **Configurações Flexíveis:**
  - Controle de preferências gerais, incluindo opção para habilitar ou desabilitar o fechamento de modais ao clicar do lado de fora (overlay).
- 🏆 **Tier Lists:** Criação de Tier Lists com sistema intuitivo de Drag & Drop.

---

# 🚀 Instalação

## Pré-requisitos

O projeto utiliza:

- [Mise](https://mise.jdx.dev/) (gerenciador de dependências globais e runtime)
- Poetry (para dependências Python)
- Node.js & npm (para o frontend)

---

## Preparação do ambiente

1. Clone o repositório:
   ```bash
   git clone https://github.com/JoaoAnunciacaoDev/VisualMemory.git
   cd VisualMemory
   ```

2. Crie o arquivo de ambiente e preencha as chaves:
   ```bash
   cp .env.example .env
   ```
   *Nota: Configure a variável `STEAM_API_KEY` para ativar a sincronização com a Steam.*

3. Instale as ferramentas requeridas via Mise:
   ```bash
   mise install
   ```

4. Configure todo o ambiente (instalação de dependências front/back e migrações do banco):
   ```bash
   mise run setup
   ```

---

# ▶️ Execução

## 🐳 Via Docker (Recomendado / Produção)

O projeto conta com suporte completo para Docker e Docker Compose.

1. **Subir toda a infraestrutura:**
   ```bash
   docker compose up --build -d
   ```
   *O frontend estará disponível em `http://localhost` e o backend em `http://localhost:8000`.*

2. **Promover uma conta a administrador pelo Docker:**
   ```bash
   docker compose exec backend poetry run python -m app.scripts.manage_admin --email seu-email@email.com --action promote
   ```

---

## 🛠️ Via CLI (Desenvolvimento Local)

### Backend
```bash
mise run api.back
```
Disponível em: `http://localhost:8000` (documentação automática em `http://localhost:8000/docs`).

### Frontend
```bash
mise run api.front
```
Disponível em: `http://localhost:5173`

---

# 🗄️ Base de Dados

O projeto utiliza **SQLAlchemy 2.0** com tipagem forte (`Mapped` e `mapped_column`) e controle de migrações com **Alembic**.

Durante o desenvolvimento utiliza SQLite (`visualmemory.db`). Em produção pode utilizar PostgreSQL através da variável:
```env
DATABASE_URL=postgresql://user:password@host/dbname
```

### Criar uma nova migração
```bash
poetry run alembic revision --autogenerate -m "descricao da mudanca"
```

### Aplicar as migrações existentes
```bash
poetry run alembic upgrade head
```

---

# 🧪 Testes e Qualidade

## Executar Linter (Ruff & ESLint)
```bash
# Backend (Ruff)
mise run back.lint       # Analisa erros
mise run back.lint.fix   # Corrige imports e pequenos problemas
mise run back.formatter  # Formata o estilo do código

# Frontend (ESLint)
mise run front.lint      # Analisa erros do React/TypeScript
```

## Executar Testes Unitários
```bash
# Backend (Pytest)
mise run back.test

# Frontend (Vitest)
mise run front.test
```

## Executar Testes End-to-End (Playwright)
```bash
mise run e2e.test        # Roda os testes no terminal
mise run e2e.ui          # Abre o painel interativo do Playwright
```

---

# 🗂️ Estrutura do Projeto

```text
VisualMemory/
├── .github/               # Workflows de CI/CD (GitHub Actions)
├── alembic/               # Histórico de migrações do banco de dados
├── app/                   # Código-fonte do Backend (FastAPI)
│   ├── enums/             # Enums compartilhados (status do jogo, lojas)
│   ├── models/            # Modelos do ORM SQLAlchemy 2.0 (User, Game, SteamAccount)
│   ├── routers/           # Roteadores/Endpoints da API (auth, games, steam, admin)
│   ├── schemas/           # Esquemas de validação Pydantic v2
│   ├── scripts/           # Scripts utilitários de CLI (manage_admin.py)
│   ├── services/          # Serviços externos e lógicas complexas (Steam API, storage)
│   ├── tests/             # Suíte de testes unitários do backend (Pytest)
│   ├── database.py        # Inicialização do DB Session
│   ├── limiter.py         # Configuração de limitação de requisições
│   ├── main.py            # Ponto de entrada do FastAPI
│   ├── security.py        # Auxiliares de hashing e geração de tokens JWT
│   └── utils.py           # Utilitários globais de tratamento de dados
│
├── frontend/              # Código-fonte do Frontend (Vite + React + TS)
│   ├── public/            # Recursos e mídias estáticas
│   ├── src/
│   │   ├── assets/        # Recursos de imagem/estilo
│   │   ├── components/    # Componentes modulares (Modal, LibraryCard, SettingsModal)
│   │   ├── hooks/         # Hooks customizados do React (useLibrary, useAuth)
│   │   ├── pages/         # Páginas do aplicativo (Library, Profile, Login, Admin)
│   │   ├── providers/     # Context Providers (Auth, Toast)
│   │   ├── services/      # Integração e cliente HTTP Axios
│   │   ├── styles/        # CSS global e de layout
│   │   ├── test/          # Testes unitários de componentes e hooks (Vitest)
│   │   └── types/         # Definições de tipagem do TypeScript
│   └── tests/             # Testes End-to-End (Playwright)
│
├── uploads/               # Diretório local para uploads de capas personalizadas
├── data_prod/             # Volume local persistido do banco de dados SQLite no Docker
├── uploads_prod/          # Volume local persistido das imagens de capas no Docker
├── mise.toml              # Orquestrador de tarefas do projeto
├── pyproject.toml         # Gerenciamento de pacotes Python (Poetry)
└── README.md              # Documentação oficial do projeto
```

---

# 🛡️ Segurança

- Hashing de senhas seguro e geração de tokens JWT.
- Rate limiting nas rotas de login/autenticação usando SlowAPI.
- Normalização e validação de payloads com Pydantic v2.
- Proteção de escopo e privilégios: apenas o proprietário pode alterar os registros da sua biblioteca.
- Parser robusto de dados (`safe_load_json_list`) para prevenir vulnerabilidades de decodificação na leitura do DB.
- Imagens Docker endurecidas contra CVEs (OS atualizado e Pip moderno no build).

---

## ❤️ Autor

Desenvolvido por [João Victor Anunciação da Silva](https://github.com/JoaoAnunciacaoDev).
