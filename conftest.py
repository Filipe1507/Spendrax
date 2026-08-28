import os
import pytest

# Aponta o cliente Redis para a base 15 (isolada da 0, usada em desenvolvimento).
# Tem de ser definido ANTES de importar o módulo cache, porque o cliente
# é criado no momento do import.
os.environ["REDIS_URL"] = "redis://localhost:6379/15"

from cache import redis_client  # noqa: E402


@pytest.fixture(autouse=True)
def limpar_redis():
    """Garante que cada teste começa com o Redis vazio."""
    redis_client.flushdb()
    yield
    redis_client.flushdb()