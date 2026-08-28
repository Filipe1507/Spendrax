"""
Popula a base de dados com transações de teste para medir o impacto da cache.
Uso:  python seed_data.py
"""
import random
from datetime import date, timedelta
from database import SessionLocal
import models

USER_ID = 1
MESES = 120
TRANSACOES_POR_MES = (500, 1000)   # intervalo aleatório

DESPESAS = [
    ("Supermercado", 15, 90), ("Café", 1, 4), ("Almoço fora", 7, 20),
    ("Combustível", 30, 70), ("Passe mensal", 30, 45), ("Farmácia", 5, 40),
    ("Netflix", 8, 14), ("Spotify", 6, 11), ("Ginásio", 20, 40),
    ("Renda", 350, 550), ("Eletricidade", 25, 70), ("Internet", 25, 40),
    ("Livros", 10, 35), ("Cinema", 7, 15), ("Roupa", 20, 90),
]

RECEITAS = [
    ("Salário", 900, 1400), ("Arbitragem", 200, 400), ("Freelance", 100, 400),
]


def main():
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.id == USER_ID).first()
        if not user:
            print(f"Utilizador {USER_ID} não existe. Regista-te primeiro na app.")
            return

        categorias = db.query(models.Category).filter(
            models.Category.user_id == USER_ID
        ).all()
        cat_ids = [c.id for c in categorias] or [None]

        hoje = date.today()
        criadas = 0

        for m in range(MESES):
            # recua m meses a partir do mês atual
            ano = hoje.year
            mes = hoje.month - m
            while mes <= 0:
                mes += 12
                ano -= 1

            n = random.randint(*TRANSACOES_POR_MES)
            for _ in range(n):
                if random.random() < 0.18:
                    desc, lo, hi = random.choice(RECEITAS)
                    tipo = "income"
                else:
                    desc, lo, hi = random.choice(DESPESAS)
                    tipo = "expense"

                dia = random.randint(1, 28)
                db.add(models.Transaction(
                    user_id=USER_ID,
                    description=desc,
                    amount=round(random.uniform(lo, hi), 2),
                    type=tipo,
                    date=date(ano, mes, dia),
                    category_id=random.choice(cat_ids),
                ))
                criadas += 1

            db.commit()
            print(f"  {ano}-{mes:02d}: {n} transações")

        print(f"\nTotal: {criadas} transações criadas para o utilizador {USER_ID}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()