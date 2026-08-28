from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import auth, transactions, categories, budgets, savings
import auth, transactions, categories, budgets, savings, ai


# Cria todas as tabelas na base de dados
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SpendWise API",
    description="API para controlo de despesas pessoais",
    version="1.0.0"
)

# Permite chamadas do frontend (React em localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://spendwise.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Regista as rotas
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["Budgets"])
app.include_router(savings.router, prefix="/api/savings", tags=["Savings"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])

@app.get("/")
def root():
    return {"message": "SpendWise API is running 🚀"}

#REDIS
@app.get("/health/redis")
def health_redis():
    return {"redis": "up" if redis_is_up() else "down"}