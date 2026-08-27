"""add customers and documents tables

Revision ID: 8141b9676fdb
Revises: 17e3f1dfbd47
Create Date: 2026-08-27 08:39:52.271479

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8141b9676fdb'
down_revision = ('2f6c0d1e9a72', '4c1098f722e4')
branch_labels = None
depends_on = None


def upgrade():
    # Extend the existing persistent customers table; never recreate it.
    # This preserves customers created before the CM feature was merged.
    with op.batch_alter_table('customers', schema=None) as batch_op:
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')))
        batch_op.add_column(sa.Column('email', sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column('gender', sa.String(length=16), nullable=True))
        batch_op.add_column(sa.Column('date_of_birth', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('business_type', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('business_registration_number', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('address', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('latitude', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('longitude', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('seasonal_pattern', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('registered_by', sa.String(length=100), nullable=True))

    op.create_table('documents',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('customer_id', sa.String(length=36), nullable=False),
    sa.Column('document_type', sa.String(length=20), nullable=False),
    sa.Column('original_filename', sa.String(length=255), nullable=False),
    sa.Column('storage_path', sa.String(length=500), nullable=False),
    sa.Column('mime_type', sa.String(length=100), nullable=True),
    sa.Column('size_bytes', sa.Integer(), nullable=True),
    sa.Column('uploaded_by', sa.String(length=100), nullable=True),
    sa.Column('uploaded_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_documents_customer_id'), ['customer_id'], unique=False)

    # ### end Alembic commands ###


def downgrade():
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_documents_customer_id'))

    op.drop_table('documents')
    with op.batch_alter_table('customers', schema=None) as batch_op:
        batch_op.drop_column('registered_by')
        batch_op.drop_column('seasonal_pattern')
        batch_op.drop_column('longitude')
        batch_op.drop_column('latitude')
        batch_op.drop_column('address')
        batch_op.drop_column('business_registration_number')
        batch_op.drop_column('business_type')
        batch_op.drop_column('date_of_birth')
        batch_op.drop_column('gender')
        batch_op.drop_column('email')
        batch_op.drop_column('updated_at')
