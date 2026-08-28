"""initial schema

Revision ID: 78d319faa92f
Revises: 
Create Date: 2026-08-28 17:06:44.750642

Baseline migration. O esquema já existia na base de dados quando o Alembic
foi introduzido no projeto, criado por Base.metadata.create_all() e por
índices aplicados manualmente. Esta revisão serve apenas como ponto de
partida do versionamento — não executa alterações.

Aplicada com `alembic stamp head`, não com `alembic upgrade`.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '78d319faa92f'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Baseline — nada a aplicar."""
    pass


def downgrade() -> None:
    """Baseline — nada a reverter."""
    pass