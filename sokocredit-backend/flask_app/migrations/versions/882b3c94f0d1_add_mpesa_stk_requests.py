"""Add M-PESA STK request tracking.

Revision ID: 882b3c94f0d1
Revises: 17e3f1dfbd47
"""
from alembic import op
import sqlalchemy as sa


revision = '882b3c94f0d1'
down_revision = '17e3f1dfbd47'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'mpesa_stk_requests',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('loan_id', sa.String(length=36), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('phone_number', sa.String(length=16), nullable=False),
        sa.Column('checkout_request_id', sa.String(length=100), nullable=False),
        sa.Column('merchant_request_id', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('result_code', sa.Integer(), nullable=True),
        sa.Column('result_desc', sa.Text(), nullable=True),
        sa.Column('mpesa_receipt_number', sa.String(length=100), nullable=True),
        sa.Column('callback_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['loan_id'], ['loans.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('checkout_request_id'),
        sa.UniqueConstraint('mpesa_receipt_number'),
    )
    with op.batch_alter_table('mpesa_stk_requests') as batch_op:
        batch_op.create_index(batch_op.f('ix_mpesa_stk_requests_loan_id'), ['loan_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_mpesa_stk_requests_status'), ['status'], unique=False)


def downgrade():
    with op.batch_alter_table('mpesa_stk_requests') as batch_op:
        batch_op.drop_index(batch_op.f('ix_mpesa_stk_requests_status'))
        batch_op.drop_index(batch_op.f('ix_mpesa_stk_requests_loan_id'))
    op.drop_table('mpesa_stk_requests')
