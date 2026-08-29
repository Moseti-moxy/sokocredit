"""Group lending for women's groups / chamas: a LendingGroup ties several
Customer records together; loans tagged with the same group_id can be listed
and summarised together, and shared_liability flags whether the group is
jointly responsible for a member's default (informational for now - actual
cross-liability collection is a lending-policy decision, not something to
silently automate)."""
from flask import Blueprint, jsonify, request

from .audit import log_action
from .extensions import db
from .models import Customer, Loan, LendingGroup
from .security import role_required

groups = Blueprint('groups', __name__, url_prefix='/api/groups')


def error(message, status=400):
    return jsonify(error=message), status


def body():
    return request.get_json(silent=True) or {}


def serialize_group(group, include_members=False):
    data = {
        'id': group.id, 'name': group.name, 'market': group.market,
        'sharedLiability': group.shared_liability, 'notes': group.notes,
        'createdBy': group.created_by, 'createdAt': group.created_at.isoformat(),
        'memberCount': len(group.members),
    }
    if include_members:
        data['members'] = [{'id': m.id, 'fullName': m.full_name, 'phoneNumber': m.phone_number} for m in group.members]
        data['loans'] = [{'id': l.id, 'customerId': l.customer_id, 'amount': float(l.amount), 'status': l.status} for l in group.loans]
    return data


@groups.post('')
@role_required('admin', 'lender')
def create_group():
    """
    Create a lending group (chama)
    ---
    tags: [Groups]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [name]
          properties:
            name: {type: string}
            market: {type: string}
            sharedLiability: {type: boolean, default: true}
            notes: {type: string}
    responses:
      201: {description: Group created}
      400: {description: Validation error}
      409: {description: A group with this name already exists}
    """
    values = body()
    name = str(values.get('name', '')).strip()
    if not name:
        return error('name is required.')
    if LendingGroup.query.filter_by(name=name).first():
        return error('A group with this name already exists.', 409)
    group = LendingGroup(
        name=name, market=values.get('market'), shared_liability=bool(values.get('sharedLiability', True)),
        notes=values.get('notes'), created_by=values.get('createdBy'),
    )
    db.session.add(group)
    log_action('CREATE_GROUP', 'LendingGroup', group.id, {'name': name})
    db.session.commit()
    return jsonify(group=serialize_group(group)), 201


@groups.get('')
@role_required('admin', 'lender', 'agent')
def list_groups():
    """
    List lending groups
    ---
    tags: [Groups]
    security: [{Bearer: []}]
    responses:
      200: {description: Array of groups}
    """
    return jsonify(groups=[serialize_group(g) for g in LendingGroup.query.order_by(LendingGroup.created_at.desc()).all()])


@groups.get('/<group_id>')
@role_required('admin', 'lender', 'agent')
def get_group(group_id):
    """
    Get a group, its members, and its loans
    ---
    tags: [Groups]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: group_id
        type: string
        required: true
    responses:
      200: {description: The group with members and loans}
      404: {description: Group not found}
    """
    group = db.session.get(LendingGroup, group_id)
    if not group:
        return error('Group not found.', 404)
    return jsonify(group=serialize_group(group, include_members=True))


@groups.post('/<group_id>/members/<customer_id>')
@role_required('admin', 'lender')
def add_member(group_id, customer_id):
    """
    Add a customer to a lending group
    ---
    tags: [Groups]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: group_id
        type: string
        required: true
      - in: path
        name: customer_id
        type: string
        required: true
    responses:
      200: {description: Customer added to the group}
      404: {description: Group or customer not found}
    """
    group = db.session.get(LendingGroup, group_id)
    customer = db.session.get(Customer, customer_id)
    if not group or not customer:
        return error('Group or customer not found.', 404)
    customer.group_id = group.id
    log_action('ADD_GROUP_MEMBER', 'LendingGroup', group.id, {'customerId': customer.id})
    db.session.commit()
    return jsonify(group=serialize_group(group, include_members=True))


@groups.delete('/<group_id>/members/<customer_id>')
@role_required('admin', 'lender')
def remove_member(group_id, customer_id):
    """
    Remove a customer from a lending group
    ---
    tags: [Groups]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: group_id
        type: string
        required: true
      - in: path
        name: customer_id
        type: string
        required: true
    responses:
      200: {description: Customer removed}
      404: {description: Group or customer not found, or customer is not in this group}
    """
    group = db.session.get(LendingGroup, group_id)
    customer = db.session.get(Customer, customer_id)
    if not group or not customer or customer.group_id != group.id:
        return error('Group or customer not found, or customer is not in this group.', 404)
    customer.group_id = None
    log_action('REMOVE_GROUP_MEMBER', 'LendingGroup', group.id, {'customerId': customer.id})
    db.session.commit()
    return jsonify(group=serialize_group(group, include_members=True))
