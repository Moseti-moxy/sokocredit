"""add geofence columns and table

Revision ID: 20260901_add_geofence
Revises: 9bdbc9bc3824
Create Date: 2026-09-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260901_add_geofence'
down_revision = '9bdbc9bc3824'
branch_labels = None
depends_on = None


def upgrade():
    # ``latitude`` and ``longitude`` were added by migration
    # 8141b9676fdb. Add only the geofence-specific fields here.
    with op.batch_alter_table('customers', schema=None) as batch_op:
        batch_op.add_column(sa.Column('registered_lat', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('registered_lng', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('zone_radius_m', sa.Integer(), nullable=False, server_default='200'))

    # Create geofence_alerts table
    op.create_table(
        'geofence_alerts',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('type', sa.String(length=32), nullable=False),
        sa.Column('customer_id', sa.String(length=36), sa.ForeignKey('customers.id'), nullable=False, index=True),
        sa.Column('agent_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('distance_m', sa.Float(), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='open'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('geofence_alerts')
    with op.batch_alter_table('customers', schema=None) as batch_op:
        batch_op.drop_column('zone_radius_m')
        batch_op.drop_column('registered_lng')
        batch_op.drop_column('registered_lat')
