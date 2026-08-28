"""Mede o tempo de resposta com e sem cache."""
import time
import statistics
import requests
from auth_utils import create_access_token
from cache import redis_client

BASE = "http://127.0.0.1:8000"
USER_ID = 1
N = 30

ROTAS = [
    ("/api/transactions/summary/monthly?month=8&year=2026", "Resumo mensal"),
    ("/api/transactions/summary/range?months=24", "Historico 24 meses"),
]


def main():
    headers = {"Authorization": f"Bearer {create_access_token(USER_ID)}"}

    # sanity check antes de medir seja o que for
    url = BASE + ROTAS[0][0]
    r = requests.get(url, headers=headers)
    print(f"Status: {r.status_code}")
    print(f"Resposta: {r.text[:200]}\n")
    if r.status_code != 200:
        print("Os pedidos nao estao a funcionar. Corrige isto antes de medir.")
        return

    print(f"{N} pedidos por cenario, mediana em ms\n")

    for path, nome in ROTAS:
        url = BASE + path

        sem = []
        for _ in range(N):
            redis_client.flushdb()
            t0 = time.perf_counter()
            resp = requests.get(url, headers=headers)
            sem.append((time.perf_counter() - t0) * 1000)
            assert resp.status_code == 200

        requests.get(url, headers=headers)  # popula
        com = []
        for _ in range(N):
            t0 = time.perf_counter()
            resp = requests.get(url, headers=headers)
            com.append((time.perf_counter() - t0) * 1000)
            assert resp.status_code == 200

        m_sem = statistics.median(sem)
        m_com = statistics.median(com)
        print(f"{nome}")
        print(f"  sem cache : {m_sem:7.1f} ms")
        print(f"  com cache : {m_com:7.1f} ms")
        print(f"  ganho     : {(1 - m_com/m_sem)*100:6.1f}%\n")


if __name__ == "__main__":
    main()