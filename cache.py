import os
import json
import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

redis_client = redis.from_url(REDIS_URL, decode_responses=True)

DEFAULT_TTL = 300  # 5 minutos


def cache_get(key: str):
    """Devolve o valor em cache, ou None se não existir ou o Redis estiver em baixo."""
    try:
        raw = redis_client.get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


def cache_set(key: str, value, ttl: int = DEFAULT_TTL) -> None:
    """Guarda em cache com TTL. Falha em silêncio se o Redis estiver em baixo."""
    try:
        redis_client.setex(key, ttl, json.dumps(value))
    except Exception:
        pass


def invalidate_user(user_id: int) -> None:
    """Apaga todas as chaves de cache deste utilizador.

    Usa SCAN e não KEYS: o KEYS bloqueia o Redis inteiro enquanto varre
    o keyspace todo, o que numa base grande equivale a uma paragem de serviço.
    """
    try:
        for key in redis_client.scan_iter(match=f"user:{user_id}:*", count=100):
            redis_client.delete(key)
    except Exception:
        pass


def redis_is_up() -> bool:
    """Health check da ligação ao Redis."""
    try:
        return redis_client.ping()
    except Exception:
        return False

import time
from fastapi import HTTPException


def check_rate_limit(user_id: int, limit: int = 10, window: int = 60) -> None:
    """Limita a `limit` pedidos por `window` segundos, por utilizador.

    Levanta HTTP 429 quando o limite é excedido.
    Se o Redis estiver em baixo, deixa passar (fail-open).
    """
    bucket = int(time.time() // window)
    key = f"ratelimit:ai:{user_id}:{bucket}"

    try:
        count = redis_client.incr(key)
        if count == 1:
            redis_client.expire(key, window)
    except Exception:
        return  # Redis em baixo — não bloqueia o utilizador

    if count > limit:
        ttl = redis_client.ttl(key)
        raise HTTPException(
            status_code=429,
            detail=f"Limite de {limit} pedidos por minuto atingido. Tenta daqui a {ttl}s.",
            headers={"Retry-After": str(ttl)},
        )