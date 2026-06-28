<h1 align="center">
  🎮 GameLog
</h1>

<p align="center">
  <em>Plataforma para gestão de bibliotecas de videojogos e criação de tier lists personalizadas.</em>
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

O **GameLog** é uma aplicação moderna desenvolvida com uma arquitetura desacoplada. Consiste numa API RESTful de alto desempenho interligada a uma interface fluida, permitindo aos utilizadores pesquisar títulos reais, gerir as suas coleções e organizar jogos em *tier lists*.

---

# ✨ Funcionalidades

- 🔐 Autenticação com JWT (OAuth2).
- ⏱️ Rate limiting no login contra ataques de força bruta.
- 🔍 Pesquisa de jogos utilizando a API oficial da RAWG.
- 📚 Biblioteca pessoal de jogos.
- ➕ Adição manual de jogos.
- ✏️ Edição completa de jogos adicionados manualmente.
- ⭐ Sistema de avaliação de 0 a 10 com suporte a meia estrela.
- ❤️ Sistema de favoritos.
- 📋 Listas personalizadas.
- 🤖 Listas automáticas:
  - Favoritos
  - Concluídos por ano
  - Platinados por ano
- 🏆 Criação de Tier Lists.
- 🎨 Drag & Drop para organização das tiers.
- 📱 Interface responsiva.
- ✅ Testes automatizados (Backend e Frontend).
- 🔄 CI/CD com GitHub Actions.

---

# 🚀 Instalação

## Pré-requisitos

O projeto utiliza:

- Mise
- Poetry
- Node.js
- npm

---

## Preparação do ambiente

Clone o repositório:

```bash
git clone [(https://github.com/JoaoAnunciacaoDev/GameLog)](https://github.com/JoaoAnunciacaoDev/GameLog.git)
cd GameLog
```

Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

Instale as ferramentas:

```bash
mise install
```

Configure todo o ambiente:

```bash
mise run setup
```

---

# ▶️ Execução

## Backend

```bash
mise run api.dev
```

Disponível em:

```
http://localhost:8000
```

---

## Frontend

```bash
mise run api.front
```

Disponível em:

```
http://localhost:5173
```

---

# 🗄️ Base de Dados

O projeto utiliza:

- SQLAlchemy
- Alembic

Durante o desenvolvimento utiliza SQLite.

Em produção pode utilizar PostgreSQL através da variável:

```
DATABASE_URL
```

## Criar uma migração

```bash
alembic revision --autogenerate -m "descricao da mudanca"
```

## Aplicar migrações

```bash
alembic upgrade head
```

---

# 🧪 Testes

## Backend

```bash
mise run back.test
```

ou

```bash
poetry run pytest app/tests -v
```

---

## Frontend

```bash
mise run front.test
```

ou

```bash
cd frontend
npm run test
```

---

# 🔍 Lint

## Backend

```bash
mise run back.lint
```

## Frontend

```bash
mise run front.lint
```

---

# 🗂️ Estrutura do Projeto

```text
GameLog/
├── .github/
│   └── workflows/
├── alembic/
├── app/
│   ├── enums/
│   ├── models/
│   ├── routers/
│   ├── schemas/
│   ├── services/
│   ├── tests/
│   ├── database.py
│   ├── limiter.py
│   ├── main.py
│   └── security.py
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       ├── providers/
│       ├── services/
│       ├── styles/
│       ├── test/
│       └── types/
│
├── uploads/
├── .env.example
├── mise.toml
├── pyproject.toml
├── ruff.toml
├── alembic.ini
└── README.md
```

---

# 🛡️ Segurança

- JWT configurado via `SECRET_KEY`.
- Rate limiting (5 tentativas/minuto) usando SlowAPI.
- Validações com Pydantic.
- Proteção de rotas.
- Apenas o proprietário pode alterar recursos.
- Sanitização de URLs de imagens.

---

## ❤️ Autor

Feito por **João Victor Anunciação da Silva**.
