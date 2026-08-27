"""Add persistent customer records.

Revision ID: 2f6c0d1e9a72
Revises: 882b3c94f0d1
"""
from alembic import op
import sqlalchemy as sa


revision = '2f6c0d1e9a72'
down_revision = '882b3c94f0d1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'customers',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=160), nullable=False),
        sa.Column('phone_number', sa.String(length=16), nullable=False),
        sa.Column('national_id', sa.String(length=32), nullable=False),
        sa.Column('business', sa.String(length=160), nullable=False),
        sa.Column('market', sa.String(length=160), nullable=False),
        sa.Column('stall', sa.String(length=160), nullable=False),
        sa.Column('kra_pin', sa.String(length=32)),
        sa.Column('years_operating', sa.Integer(), nullable=False),
        sa.Column('daily_turnover', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('daily_profit', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('chama', sa.String(length=160)),
        sa.Column('next_of_kin', sa.String(length=160)),
        sa.Column('relationship', sa.String(length=64)),
        sa.Column('next_of_kin_phone', sa.String(length=16)),
        sa.Column('appraisal_notes', sa.Text()),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('national_id'),
        sa.UniqueConstraint('phone_number'),
    )


def downgrade():
    op.drop_table('customers')
