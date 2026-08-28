from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Enum, Boolean,
    Index, text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class TransactionType(str, enum.Enum):
    expense = "expense"
    income = "income"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transactions = relationship("Transaction", back_populates="user")
    categories = relationship("Category", back_populates="user")
    budgets = relationship("Budget", back_populates="user")
    savings_goals = relationship("SavingsGoal", back_populates="user")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    icon = Column(String, default="💰")
    color = Column(String, default="#6366f1")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category")

    __table_args__ = (
        # Todas as queries de categorias filtram por utilizador.
        Index("idx_categories_user", "user_id"),
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    type = Column(Enum(TransactionType), nullable=False)
    is_recurring = Column(Boolean, default=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")

    __table_args__ = (
        # Serve o padrão dominante: filtrar por utilizador e ordenar por data
        # descendente. O DESC no índice evita um sort adicional na query.
        Index("idx_transactions_user_date", "user_id", text("date DESC")),

        # Índice parcial: só indexa as linhas recorrentes, que são uma
        # pequena fração do total. Muito mais pequeno que um índice completo
        # e serve inteiramente a rota /list/recurring.
        Index(
            "idx_transactions_recurring",
            "user_id", "is_recurring",
            postgresql_where=text("is_recurring = true"),
        ),
    )


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    amount_limit = Column(Float, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    year = Column(Integer, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")

    __table_args__ = (
        Index("idx_budgets_user_month", "user_id", "month", "year"),
    )


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    deadline = Column(DateTime(timezone=True), nullable=True)
    icon = Column(String, default="🎯")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="savings_goals")

    __table_args__ = (
        Index("idx_savings_user", "user_id"),
    )