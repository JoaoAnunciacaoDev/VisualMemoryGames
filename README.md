<h1 align="center">
  🎮 GameLog
</h1>

<p align="center">
  <em>Plataforma para gestão de bibliotecas de videojogos e criação de tier lists personalizadas.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <br/>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
</p>

---

## 🎯 Sobre o Projeto

O **GameLog** é uma aplicação moderna desenvolvida com uma arquitetura desacoplada. Consiste numa API RESTful de alto desempenho interligada a uma interface SPA (Single Page Application) fluida, permitindo aos utilizadores pesquisar títulos reais, gerir as suas coleções e organizar jogos em *tier lists*.

## ✨ Funcionalidades Principais

- 🔐 Autenticação de utilizadores com tokens JWT (OAuth2).
- 🔍 Pesquisa de jogos diretamente consumida a partir da API oficial da RAWG.
- 📚 Adição e gestão de jogos na biblioteca pessoal de cada utilizador.
- 🏆 Ferramenta interativa para classificar e organizar jogos visualmente.

---

## 🚀 Instalação e Preparação do Ambiente

### 📋 Pré-requisitos

Para garantir o isolamento perfeito do ambiente, este projeto utiliza o [Mise](https://mise.jdx.dev/) como gestor de ferramentas e o **Poetry** para as dependências Python.

### ⚙️ Instalação Automatizada

Clone o repositório e execute os comandos abaixo na raiz do projeto para preparar todo o ecossistema (backend e frontend):

```bash
# Instala o Node.js e ferramentas definidas no ficheiro mise.toml
mise install

# Executa as migrações (Alembic) e instala dependências (Poetry e NPM)
mise run setup

## Execução Local
1. Iniciar a API (Backend)
  mise run api.dev
  A API ficará disponível em: http://localhost:8000

2. Iniciar a Interface (Frontend)
  mise run api.front
  Ficará disponível em: http://localhost:5173
```
## 🗂️ Estrutura do Projeto

GameLog/

├── app/
│   ├── enums/
│   ├── models/
│   ├── routers/
│   ├── schemas/
│   ├── services/
│   ├── tests/
│   ├── database.py
│   ├── main.py
│   └── security.py
│
├── alembic/
│   └── versions/
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       │   ├── AuthForm/
│       │   ├── Button/
│       │   ├── ConfirmModal/
│       │   ├── CustomListTab/
│       │   ├── Footer/
│       │   ├── GameCard/
│       │   ├── GameEditModal/
│       │   ├── GameGrid/
│       │   ├── GameModal/
│       │   ├── GameSearchModal/
│       │   ├── Header/
│       │   ├── Input/
│       │   ├── Layout/
│       │   ├── LibraryCard/
│       │   ├── SearchBar/
│       │   ├── SelectGamesModal/
│       │   ├── TierListMaker/
│       │   └── Toast/
│       │
│       ├── hooks/
│       ├── pages/
│       │   ├── Home/
│       │   ├── Login/
│       │   ├── Library/
│       │   ├── TierList/
│       │   └── TierListEditor/
│       │
│       ├── services/
│       ├── styles/
│       ├── types/
│       ├── App.tsx
│       └── main.tsx
│
├── mise.toml
├── pyproject.toml
├── alembic.ini
└── README.md

## 🧪 Testes de Qualidade
Testes do Backend (Pytest):
```bash
  pytest
```

Análise de Código do Frontend (Linting):
```bash
  mise front.lint
```
