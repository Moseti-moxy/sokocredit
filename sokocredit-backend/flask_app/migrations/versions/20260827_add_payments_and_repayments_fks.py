"""Add payments table and repayment foreign keys

Revision ID: 20260827_add_payments
Revises: 17e3f1dfbd47
Create Date: 2026-08-27 00:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260827_add_payments'
down_revision = '17e3f1dfbd47'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('payments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('loan_id', sa.String(length=36), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('method', sa.String(length=32), nullable=False),
        sa.Column('provider', sa.String(length=64), nullable=True),
        sa.Column('provider_reference', sa.String(length=200), nullable=True),
        sa.Column('customer_phone', sa.String(length=50), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='RECEIVED'),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['loan_id'], ['loans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_payments_loan_id'), ['loan_id'], unique=False)

    # add columns to repayments
    with op.batch_alter_table('repayments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('payment_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('schedule_item_id', sa.String(length=36), nullable=True))
        batch_op.create_foreign_key('fk_repayments_payment', 'payments', ['payment_id'], ['id'])
        batch_op.create_foreign_key('fk_repayments_schedule_item', 'repayment_schedule_items', ['schedule_item_id'], ['id'])


def downgrade():
    with op.batch_alter_table('repayments', schema=None) as batch_op:
        batch_op.drop_constraint('fk_repayments_schedule_item', type_='foreignkey')
        batch_op.drop_constraint('fk_repayments_payment', type_='foreignkey')
        batch_op.drop_column('schedule_item_id')
        batch_op.drop_column('payment_id')

    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_payments_loan_id'))
    op.drop_table('payments')
