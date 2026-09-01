"""add notifications table

Revision ID: 20260902_add_notifications
Revises: 20260901_add_geofence
Create Date: 2026-09-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260902_add_notifications'
down_revision = '20260901_add_geofence'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('notifications',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('audience_role', sa.String(length=16), nullable=True),
    sa.Column('customer_id', sa.String(length=36), nullable=True),
    sa.Column('type', sa.String(length=32), nullable=False),
    sa.Column('title', sa.String(length=160), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('related_entity_type', sa.String(length=32), nullable=True),
    sa.Column('related_entity_id', sa.String(length=36), nullable=True),
    sa.Column('read_by', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_notifications_audience_role'), ['audience_role'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_customer_id'), ['customer_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_type'), ['type'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_related_entity_id'), ['related_entity_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_created_at'), ['created_at'], unique=False)

    # ### end Alembic commands ###


def downgrade():
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notifications_created_at'))
        batch_op.drop_index(batch_op.f('ix_notifications_related_entity_id'))
        batch_op.drop_index(batch_op.f('ix_notifications_type'))
        batch_op.drop_index(batch_op.f('ix_notifications_customer_id'))
        batch_op.drop_index(batch_op.f('ix_notifications_audience_role'))

    op.drop_table('notifications')
