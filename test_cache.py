import time
import pytest
from fastapi import HTTPException

from cache import (
    cache_get,
    cache_set,
    invalidate_user,
    check_rate_limit,
    redis_client,
)


# ---------------------------------------------------------------- cache

def test_miss_devolve_none():
    assert cache_get("chave:inexistente") is None


def test_set_e_get_preservam_o_valor():
    payload = {"income": 1200.5, "expenses": 430.2, "total": 17}
    cache_set("user:1:summary:2026-08", payload)
    assert cache_get("user:1:summary:2026-08") == payload


def test_guarda_listas_e_nao_so_dicionarios():
    payload = [{"month": 7, "income": 900.0}, {"month": 8, "income": 1100.0}]
    cache_set("user:1:range:24", payload)
    assert cache_get("user:1:range:24") == payload


def test_ttl_e_aplicado():
    cache_set("user:1:summary:2026-08", {"x": 1}, ttl=300)
    ttl = redis_client.ttl("user:1:summary:2026-08")
    assert 295 < ttl <= 300


def test_chave_expira_mesmo():
    cache_set("efemera", {"x": 1}, ttl=1)
    assert cache_get("efemera") is not None
    time.sleep(1.2)
    assert cache_get("efemera") is None


# --------------------------------------------------------- invalidação

def test_invalidacao_apaga_todas_as_chaves_do_utilizador():
    cache_set("user:1:summary:2026-08", {"a": 1})
    cache_set("user:1:summary:2026-07", {"a": 2})
    cache_set("user:1:range:24", [{"a": 3}])

    invalidate_user(1)

    assert cache_get("user:1:summary:2026-08") is None
    assert cache_get("user:1:summary:2026-07") is None
    assert cache_get("user:1:range:24") is None


def test_invalidacao_nao_afeta_outros_utilizadores():
    """O teste mais importante do ficheiro: isolamento entre utilizadores."""
    cache_set("user:1:summary:2026-08", {"user": 1})
    cache_set("user:2:summary:2026-08", {"user": 2})

    invalidate_user(1)

    assert cache_get("user:1:summary:2026-08") is None
    assert cache_get("user:2:summary:2026-08") == {"user": 2}


def test_invalidar_utilizador_sem_cache_nao_rebenta():
    invalidate_user(999)  # não deve levantar exceção


# -------------------------------------------------------- rate limiting

def test_permite_ate_ao_limite():
    for _ in range(10):
        check_rate_limit(user_id=1, limit=10, window=60)
    # se chegou aqui sem exceção, passou


def test_bloqueia_acima_do_limite():
    for _ in range(10):
        check_rate_limit(user_id=1, limit=10, window=60)

    with pytest.raises(HTTPException) as exc:
        check_rate_limit(user_id=1, limit=10, window=60)

    assert exc.value.status_code == 429


def test_limite_e_por_utilizador():
    """Esgotar a quota do utilizador 1 não pode afetar o utilizador 2."""
    for _ in range(10):
        check_rate_limit(user_id=1, limit=10, window=60)

    check_rate_limit(user_id=2, limit=10, window=60)  # não deve rebentar


def test_resposta_429_indica_quando_tentar_de_novo():
    for _ in range(3):
        check_rate_limit(user_id=1, limit=3, window=60)

    with pytest.raises(HTTPException) as exc:
        check_rate_limit(user_id=1, limit=3, window=60)

    assert "Retry-After" in exc.value.headers

def test_cache_falha_em_silencio_se_redis_estiver_em_baixo(monkeypatch):
    """Se o Redis morrer, a app degrada para o PostgreSQL em vez de rebentar."""
    def rebenta(*args, **kwargs):
        raise ConnectionError("Redis indisponível")

    monkeypatch.setattr(redis_client, "get", rebenta)
    monkeypatch.setattr(redis_client, "set", rebenta)

    assert cache_get("qualquer:chave") is None   # comporta-se como miss
    cache_set("qualquer:chave", {"x": 1})        # não levanta exceção


def test_rate_limit_deixa_passar_se_redis_estiver_em_baixo(monkeypatch):
    """Decisão consciente: fail-open — disponibilidade acima do controlo de custos."""
    def rebenta(*args, **kwargs):
        raise ConnectionError("Redis indisponível")

    monkeypatch.setattr(redis_client, "incr", rebenta)
    check_rate_limit(user_id=1, limit=10, window=60)  # não bloqueia