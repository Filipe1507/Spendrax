<<<<<<< HEAD
# 💰 SpendWise

App full-stack de controlo de despesas pessoais — projeto de portfólio.

**Stack:** Python · FastAPI · PostgreSQL · React · TypeScript

---

## 🗂️ Estrutura do projeto

```
spendwise/
├── backend/          ← API Python + FastAPI
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth_utils.py
│   ├── requirements.txt
│   ├── .env.example
│   └── routes/
│       ├── auth.py
│       ├── transactions.py
│       ├── categories.py
│       └── budgets.py
│
└── frontend/         ← (a criar na semana 3)
```

---

## ⚙️ Setup do Backend (passo a passo)

### 1. Criar a base de dados no PostgreSQL

Abre o teu SQL Manager (pgAdmin ou DBeaver) e executa:

```sql
CREATE DATABASE spendwise;
```

### 2. Clonar / copiar o projeto e abrir no VS Code

```
Abre a pasta spendwise/backend no VS Code
```

### 3. Criar ambiente virtual Python

No terminal do VS Code (`Ctrl + '`):

```bash
# Criar ambiente virtual
python -m venv venv

# Ativar (Windows)
venv\Scripts\activate

# Ativar (Mac/Linux)
source venv/bin/activate
```

> Deves ver `(venv)` no início da linha do terminal — significa que está ativo.

### 4. Instalar dependências

```bash
pip install -r requirements.txt
```

### 5. Configurar variáveis de ambiente

```bash
# Copia o ficheiro de exemplo
copy .env.example .env      # Windows
cp .env.example .env        # Mac/Linux
```

Abre o ficheiro `.env` e preenche:
- `DATABASE_URL` → muda `A_TUA_PASSWORD` para a password do teu PostgreSQL
- `SECRET_KEY` → qualquer string longa e aleatória (ex: `spendwise_super_secret_2024`)

### 6. Arrancar o servidor

```bash
uvicorn main:app --reload
```

Deves ver:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 7. Testar a API (Swagger automático)

Abre no browser: **http://localhost:8000/docs**

Vais ver toda a API documentada automaticamente pelo FastAPI 🎉

---

## 🧪 Testar os endpoints

No Swagger (`/docs`), experimenta por esta ordem:

1. **POST /api/auth/register** → cria uma conta
2. Clica em "Authorize" (canto superior direito) e cola o `access_token` recebido
3. **GET /api/categories/** → vê as categorias padrão criadas automaticamente
4. **POST /api/transactions/** → adiciona uma despesa
5. **GET /api/transactions/summary/monthly?month=3&year=2026** → vê o resumo

---

## 📌 Próximos passos

- [ ] Semana 3: criar o frontend em React + TypeScript
- [ ] Semana 5: adicionar gráficos (Recharts)
- [ ] Semana 6: implementar orçamentos com alertas
- [ ] Semana 7: deploy no Render (backend) + Vercel (frontend)

---

## 👤 Autor

Filipe Ferreira · LinkedIn : https://www.linkedin.com/in/filipe-ferreira-67972b35a
=======
Spendrax

A full-stack personal finance application that helps users track income and expenses, set budgets and savings goals, and manage their money with the help of an AI assistant. Users can type transactions in plain language, and an LLM interprets them, creating the right entries automatically.

Features


Dashboard with monthly income, expenses, and balance at a glance
Transactions — full CRUD, scoped per user, with monthly summaries
Recurring transactions — define fixed income/expenses (e.g. salary, rent) that are created each month automatically
AI chatbot (LLaMA 3.3 via Groq) — interprets natural-language input ("I got paid 1000€ today") and creates transactions, including recurrence detection
Budgets and savings goals with progress tracking
CSV export of transaction history
JWT authentication — each user only ever sees their own data


Tech Stack

Frontend


React + TypeScript
Tailwind CSS


Backend


FastAPI (Python)
SQLAlchemy ORM
PostgreSQL
JWT for authentication


AI


Groq API (LLaMA 3.3) for natural-language transaction parsing


Performance

Optimised data fetching on the dashboard by combining PostgreSQL indexing, aggregated SQL queries and React memoisation, reducing the number of API calls per page load from 24 to 1.

Project Structure

spendrax/
├── frontend/        # React + TypeScript client
└── backend/         # FastAPI + PostgreSQL API

Getting Started

Prerequisites


Python 3.11+
Node.js 18+
PostgreSQL running locally on port 5432


Backend

bashcd backend
python -m venv venv
# Windows
venv\Scripts\Activate.ps1
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload

The API will be available at http://127.0.0.1:8000, with interactive docs at http://127.0.0.1:8000/docs.


Make sure the PostgreSQL service is running before starting the API, otherwise the connection to localhost:5432 will be refused.



Frontend

In a separate terminal:

bashcd frontend
npm install
npm run dev

The frontend runs on its own port and talks to the backend API.

Environment Variables

Create a .env file in the backend folder:

envDATABASE_URL=postgresql://postgres:your_password@localhost:5432/spendrax
GROQ_API_KEY=your_groq_api_key
SECRET_KEY=your_jwt_secret_key


Never commit your .env file — it is excluded via .gitignore.



License

This project is for personal and portfolio use.
>>>>>>> 3dedc92e1b70ef95dd637f2e255810882042f58f
