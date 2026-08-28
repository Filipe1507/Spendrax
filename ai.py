import os
import json
import requests
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, case
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from auth_utils import get_current_user
from cache import check_rate_limit
import models
from dotenv import load_dotenv
load_dotenv()

router = APIRouter()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
         "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]


def call_groq(prompt: str, max_tokens: int, temperature: float) -> dict:
    """Chama a Groq e devolve o JSON já parseado. Levanta HTTPException em falha."""
    if not GROQ_API_KEY:
        raise HTTPException(500, "GROQ_API_KEY não configurada no servidor")

    try:
        r = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json={
                "model": "openai/gpt-oss-120b",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            timeout=30,
        )
        r.raise_for_status()
        raw = r.json()["choices"][0]["message"]["content"].strip()
    except requests.Timeout:
        raise HTTPException(504, "O serviço de IA demorou demasiado tempo")
    except Exception as e:
        print(f"[GROQ ERRO] {type(e).__name__}: {e}")
        if hasattr(e, "response") and e.response is not None:
            print(f"[GROQ RESPOSTA] {e.response.status_code}: {e.response.text[:500]}")
        raise HTTPException(502, "Erro a contactar o serviço de IA")

    cleaned = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        raise HTTPException(422, "A resposta da IA não veio em formato válido")


# ---------------------------------------------------------------- /parse

class ParseRequest(BaseModel):
    text: str


@router.post("/parse")
def parse_transaction(
    body: ParseRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_rate_limit(current_user.id, limit=10, window=60)

    texto = body.text.strip()
    if not texto or len(texto) > 300:
        raise HTTPException(400, "Texto inválido")

    categorias = db.query(models.Category).filter(
        models.Category.user_id == current_user.id
    ).all()
    nomes = [c.name for c in categorias]

    prompt = f"""Analisa este texto e extrai informação de uma transação financeira.
Texto: "{texto}"

Categorias disponíveis: {', '.join(nomes)}

Responde APENAS com um JSON válido, sem texto extra, sem markdown, sem backticks:
{{
  "description": "descrição curta da transação",
  "amount": valor_numerico_positivo,
  "type": "expense" ou "income",
  "category_name": "uma das categorias disponíveis ou a mais próxima",
  "is_recurring": true ou false
}}

Regras:
- type é "income" se for salário, receita, ganho, reembolso
- type é "expense" para tudo o resto
- amount é sempre positivo
- description deve ser clara e curta
- category_name deve ser exatamente uma das categorias disponíveis
- is_recurring é APENAS true se o texto mencionar EXPLICITAMENTE "todos os meses", "mensalmente", "todo o mês", "sempre", "fixo mensal", "mensal", "recorrente", "cada mês". Se não mencionar nada disso, is_recurring é SEMPRE false."""

    parsed = call_groq(prompt, max_tokens=800, temperature=0.1)

    if parsed.get("type") not in ("expense", "income"):
        parsed["type"] = "expense"
    if parsed.get("category_name") not in nomes:
        parsed["category_name"] = nomes[0] if nomes else ""
    try:
        parsed["amount"] = abs(float(parsed.get("amount", 0)))
    except (TypeError, ValueError):
        raise HTTPException(422, "Valor não reconhecido")
    parsed["is_recurring"] = bool(parsed.get("is_recurring", False))
    parsed["description"] = str(parsed.get("description", texto))[:100]

    return parsed


# --------------------------------------------------------------- /report

class ReportRequest(BaseModel):
    period: str  # "1M" | "3M" | "6M" | "1A"


PERIOD_MONTHS = {"1M": 1, "3M": 3, "6M": 6, "1A": 12}


@router.post("/report")
def financial_report(
    body: ReportRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_rate_limit(current_user.id, limit=3, window=60)

    months = PERIOD_MONTHS.get(body.period)
    if months is None:
        raise HTTPException(400, "Período inválido")

    # histórico mensal, direto da BD
    rows = db.query(
        extract("year", models.Transaction.date).label("year"),
        extract("month", models.Transaction.date).label("month"),
        func.coalesce(func.sum(
            case((models.Transaction.type == 'income', models.Transaction.amount), else_=0)
        ), 0).label("income"),
        func.coalesce(func.sum(
            case((models.Transaction.type == 'expense', models.Transaction.amount), else_=0)
        ), 0).label("expenses"),
    ).filter(
        models.Transaction.user_id == current_user.id
    ).group_by(
        extract("year", models.Transaction.date),
        extract("month", models.Transaction.date),
    ).order_by(
        extract("year", models.Transaction.date),
        extract("month", models.Transaction.date),
    ).all()

    recentes = [r for r in rows if float(r.income) > 0 or float(r.expenses) > 0][-6:]
    if not recentes:
        raise HTTPException(400, "Não há dados suficientes. Adiciona algumas transações primeiro.")

    avg_income = sum(float(r.income) for r in recentes) / len(recentes)
    avg_expenses = sum(float(r.expenses) for r in recentes) / len(recentes)
    avg_savings = avg_income - avg_expenses
    taxa = (avg_savings / avg_income * 100) if avg_income > 0 else 0

    historico = "\n".join(
        f"{MESES[int(r.month) - 1]} {int(r.year)}: Receitas {float(r.income):.2f}€, "
        f"Despesas {float(r.expenses):.2f}€, Poupança {float(r.income) - float(r.expenses):.2f}€"
        for r in recentes
    )

    recorrentes = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.is_recurring == True
    ).all()

    fixas = sum(float(t.amount) for t in recorrentes if t.type == "expense")
    lista_recorrentes = "\n".join(
        f"{t.description}: {float(t.amount):.2f}€ ({'despesa' if t.type == 'expense' else 'receita'} fixa)"
        for t in recorrentes
    ) or "Nenhuma despesa fixa registada"

    label_periodo = f"{months} {'mês' if months == 1 else 'meses'}"

    prompt = f"""És um consultor financeiro pessoal sénior especializado no mercado português. Tens 20 anos de experiência e conheces bem os custos de vida em Portugal — rendas, supermercados, transportes, lazer. Analisa os dados deste utilizador com pensamento crítico e profundidade real.

CONTEXTO DO MERCADO PORTUGUÊS (usa como referência):
- Salário mínimo nacional: 820€/mês
- Salário médio em Portugal: ~1200€/mês
- Renda média Lisboa: 800-1200€ | Porto: 600-900€ | Interior: 300-500€
- Supermercado família: 200-400€/mês
- Transportes: 40-150€/mês
- Lazer razoável: 50-150€/mês

DADOS FINANCEIROS DO UTILIZADOR:
Histórico dos últimos {len(recentes)} meses:
{historico}

Médias mensais:
- Receita: {avg_income:.2f}€
- Despesas totais: {avg_expenses:.2f}€
- Poupança: {avg_savings:.2f}€
- Taxa de poupança: {taxa:.1f}%

Despesas fixas registadas:
{lista_recorrentes}
Total fixo mensal: {fixas:.2f}€
Despesas variáveis estimadas: {avg_expenses - fixas:.2f}€/mês

PERÍODO DE ANÁLISE: {label_periodo}

INSTRUÇÕES CRÍTICAS:
- NÃO faças observações óbvias como "gastar menos aumenta a poupança"
- Analisa a proporção das despesas face ao rendimento, não valores absolutos isolados
- Se a taxa de poupança for superior a 40%, reconhece que o utilizador já tem um excelente perfil financeiro
- Os insights devem ter lógica financeira real — se as despesas variáveis são muito baixas, não faz sentido pedir para as reduzir
- As recomendações devem ser ACIONÁVEIS e ESPECÍFICAS para Portugal — menciona produtos financeiros portugueses reais (PPR, certificados de aforro, fundos índice)
- Se o utilizador já poupa muito, foca-te em como FAZER CRESCER essa poupança
- Usa valores reais dos dados para todos os cálculos

Responde APENAS com JSON válido sem markdown:
{{
  "profile": "poupador" ou "equilibrado" ou "gastador" ou "irregular",
  "profile_label": "frase curta e honesta sobre o perfil financeiro em português",
  "summary": "análise honesta e profunda em 3-4 frases com valores reais",
  "monthly_savings_potential": valor_numerico_realista,
  "predictions": [
    {{"period": "1 mês", "months": 1, "predicted_expenses": valor, "predicted_savings": valor, "cumulative_savings": valor}},
    {{"period": "{label_periodo}", "months": {months}, "predicted_expenses": valor_total_periodo, "predicted_savings": valor_mensal, "cumulative_savings": valor_total_acumulado}}
  ],
  "insights": [
    {{"title": "título específico e não óbvio", "description": "insight com lógica financeira real e valores concretos", "impact": "alto" ou "médio" ou "baixo", "saving": valor_numerico_mensal}}
  ],
  "recommendations": [
    "recomendação 1 específica para Portugal com produto financeiro real",
    "recomendação 2 com ação concreta para esta semana",
    "recomendação 3 de longo prazo"
  ],
  "warning": "aviso se houver algo preocupante, senão null"
}}"""

    resultado = call_groq(prompt, max_tokens=4000, temperature=0.4)

    # validação mínima da estrutura
    if resultado.get("profile") not in ("poupador", "equilibrado", "gastador", "irregular"):
        resultado["profile"] = "equilibrado"
    resultado.setdefault("predictions", [])
    resultado.setdefault("insights", [])
    resultado.setdefault("recommendations", [])
    resultado.setdefault("warning", None)

    return resultado