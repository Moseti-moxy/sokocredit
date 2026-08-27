from datetime import date

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import Loan
from .models import CUSTOMER_STATUSES, DOCUMENT_TYPES, Customer, Document
from .scoring import compute_credit_score
from .storage import delete_customer_file, save_customer_file

customers_bp = Blueprint('customers', __name__, url_prefix='/api/customers')

REQUIRED_FIELDS = ('fullName', 'phoneNumber', 'nationalId', 'businessName', 'market', 'stallNumber', 'dailyTurnover')


def error(message, status=400):
    return jsonify(error=message), status


def body():
    return request.get_json(silent=True) or {}


def customer_or_404(customer_id):
    return db.session.get(Customer, customer_id)


def serialize_customer(customer, include_documents=False):
    data = {
        'id': customer.id,
        'fullName': customer.full_name,
        'phoneNumber': customer.phone_number,
        'nationalId': customer.national_id,
        'email': customer.email,
        'gender': customer.gender,
        'dateOfBirth': customer.date_of_birth.isoformat() if customer.date_of_birth else None,
        'businessName': customer.business_name,
        'businessType': customer.business_type,
        'businessRegistrationNumber': customer.business_registration_number,
        'yearsInBusiness': customer.years_in_business,
        'market': customer.market,
        'stallNumber': customer.stall_number,
        'address': customer.address,
        'latitude': customer.latitude,
        'longitude': customer.longitude,
        'seasonalPattern': customer.seasonal_pattern or {},
        'status': customer.status,
        'registeredBy': customer.registered_by,
        'createdAt': customer.created_at.isoformat(),
        'updatedAt': customer.updated_at.isoformat(),
        # Legacy aliases keep existing clients working while they move to the
        # richer CM customer payload.
        'name': customer.name,
        'phone': customer.phone_number,
        'business': customer.business,
        'stall': customer.stall,
        'yearsOperating': customer.years_operating,
        'kraPin': customer.kra_pin,
        'dailyTurnover': float(customer.daily_turnover),
        'dailyProfit': float(customer.daily_profit),
        'chama': customer.chama,
        'nextOfKin': customer.next_of_kin,
        'relationship': customer.relationship,
        'nextOfKinPhone': customer.next_of_kin_phone,
        'appraisalNotes': customer.appraisal_notes,
    }
    if include_documents:
        data['documents'] = [serialize_document(d) for d in customer.documents]
    return data


def serialize_document(doc):
    return {
        'id': doc.id,
        'customerId': doc.customer_id,
        'documentType': doc.document_type,
        'originalFilename': doc.original_filename,
        'mimeType': doc.mime_type,
        'sizeBytes': doc.size_bytes,
        'uploadedBy': doc.uploaded_by,
        'uploadedAt': doc.uploaded_at.isoformat(),
    }


def apply_fields(customer, values):
    if 'fullName' in values:
        customer.full_name = str(values['fullName']).strip()
    if 'phoneNumber' in values:
        customer.phone_number = str(values['phoneNumber']).strip()
    if 'nationalId' in values:
        customer.national_id = values['nationalId']
    if 'email' in values:
        customer.email = values['email']
    if 'gender' in values:
        customer.gender = values['gender']
    if 'dateOfBirth' in values:
        customer.date_of_birth = date.fromisoformat(values['dateOfBirth']) if values['dateOfBirth'] else None
    if 'businessName' in values:
        customer.business_name = str(values['businessName']).strip()
    if 'businessType' in values:
        customer.business_type = values['businessType']
    if 'businessRegistrationNumber' in values:
        customer.business_registration_number = values['businessRegistrationNumber']
    if 'yearsInBusiness' in values:
        customer.years_in_business = values['yearsInBusiness']
    if 'market' in values:
        customer.market = values['market']
    if 'stallNumber' in values:
        customer.stall_number = values['stallNumber']
    if 'address' in values:
        customer.address = values['address']
    if 'latitude' in values:
        customer.latitude = values['latitude']
    if 'longitude' in values:
        customer.longitude = values['longitude']
    if 'seasonalPattern' in values:
        customer.seasonal_pattern = values['seasonalPattern']
    if 'status' in values:
        if values['status'] not in CUSTOMER_STATUSES:
            raise ValueError('Invalid status.')
        customer.status = values['status']
    if 'registeredBy' in values:
        customer.registered_by = values['registeredBy']
    if 'kraPin' in values:
        customer.kra_pin = values['kraPin']
    if 'dailyTurnover' in values:
        customer.daily_turnover = values['dailyTurnover']
    if 'dailyProfit' in values:
        customer.daily_profit = values['dailyProfit']
    if 'chama' in values:
        customer.chama = values['chama']
    if 'nextOfKin' in values:
        customer.next_of_kin = values['nextOfKin']
    if 'relationship' in values:
        customer.relationship = values['relationship']
    if 'nextOfKinPhone' in values:
        customer.next_of_kin_phone = values['nextOfKinPhone']
    if 'appraisalNotes' in values:
        customer.appraisal_notes = values['appraisalNotes']


# ---- Customer CRUD ---------------------------------------------------------

@customers_bp.post('')
def create_customer():
    values = body()
    # Accept the existing API's field names as well as the CM names.
    values = {
        **values,
        'fullName': values.get('fullName', values.get('name')),
        'phoneNumber': values.get('phoneNumber', values.get('phone')),
        'businessName': values.get('businessName', values.get('business')),
        'stallNumber': values.get('stallNumber', values.get('stall')),
        'yearsInBusiness': values.get('yearsInBusiness', values.get('yearsOperating')),
    }
    missing = [f for f in REQUIRED_FIELDS if not str(values.get(f, '')).strip()]
    if missing:
        return error(f'Missing required field(s): {", ".join(missing)}.')
    if Customer.query.filter_by(phone_number=values['phoneNumber']).first():
        return error('A customer with this phone number already exists.', 409)

    customer = Customer(
        full_name=values['fullName'], phone_number=values['phoneNumber'], national_id=values.get('nationalId'),
        business_name=values['businessName'], market=values.get('market'), stall_number=values.get('stallNumber'),
        years_in_business=values.get('yearsInBusiness') or 0, daily_turnover=values.get('dailyTurnover') or 0,
    )
    try:
        apply_fields(customer, values)
    except (ValueError, TypeError):
        return error('One or more fields are invalid.')
    db.session.add(customer)
    db.session.commit()
    return jsonify(customer=serialize_customer(customer)), 201


@customers_bp.get('')
def list_customers():
    query = Customer.query.order_by(Customer.created_at.desc())
    if status := request.args.get('status'):
        query = query.filter_by(status=status)
    if market := request.args.get('market'):
        query = query.filter_by(market=market)
    if search := request.args.get('search'):
        like = f'%{search}%'
        query = query.filter(db.or_(Customer.full_name.ilike(like), Customer.business_name.ilike(like), Customer.phone_number.ilike(like)))
    return jsonify(customers=[serialize_customer(c) for c in query.all()])


@customers_bp.get('/<customer_id>')
def get_customer(customer_id):
    customer = customer_or_404(customer_id)
    return error('Customer not found.', 404) if not customer else jsonify(customer=serialize_customer(customer, include_documents=True))


@customers_bp.patch('/<customer_id>')
def update_customer(customer_id):
    customer = customer_or_404(customer_id)
    if not customer:
        return error('Customer not found.', 404)
    values = body()
    new_phone = values.get('phoneNumber')
    if new_phone and new_phone != customer.phone_number and Customer.query.filter_by(phone_number=new_phone).first():
        return error('A customer with this phone number already exists.', 409)
    try:
        apply_fields(customer, values)
    except (ValueError, TypeError):
        return error('One or more fields are invalid.')
    db.session.commit()
    return jsonify(customer=serialize_customer(customer))


@customers_bp.delete('/<customer_id>')
def deactivate_customer(customer_id):
    """Soft-delete: customers with loan history should never be hard-deleted."""
    customer = customer_or_404(customer_id)
    if not customer:
        return error('Customer not found.', 404)
    customer.status = 'INACTIVE'
    db.session.commit()
    return jsonify(customer=serialize_customer(customer))


# ---- Documents --------------------------------------------------------------

@customers_bp.post('/<customer_id>/documents')
def upload_document(customer_id):
    customer = customer_or_404(customer_id)
    if not customer:
        return error('Customer not found.', 404)
    document_type = request.form.get('documentType')
    if document_type not in DOCUMENT_TYPES:
        return error(f'documentType must be one of: {", ".join(sorted(DOCUMENT_TYPES))}.')
    file_storage = request.files.get('file')
    try:
        storage_path, size_bytes = save_customer_file(customer.id, file_storage)
    except ValueError as exc:
        return error(str(exc))

    document = Document(
        customer_id=customer.id, document_type=document_type, original_filename=file_storage.filename,
        storage_path=storage_path, mime_type=file_storage.mimetype, size_bytes=size_bytes,
        uploaded_by=request.form.get('uploadedBy'),
    )
    db.session.add(document)
    db.session.commit()
    return jsonify(document=serialize_document(document)), 201


@customers_bp.get('/<customer_id>/documents')
def list_documents(customer_id):
    customer = customer_or_404(customer_id)
    if not customer:
        return error('Customer not found.', 404)
    return jsonify(documents=[serialize_document(d) for d in customer.documents])


@customers_bp.delete('/<customer_id>/documents/<document_id>')
def delete_document(customer_id, document_id):
    document = db.session.get(Document, document_id)
    if not document or document.customer_id != customer_id:
        return error('Document not found.', 404)
    delete_customer_file(document.storage_path)
    db.session.delete(document)
    db.session.commit()
    return '', 204


# ---- Credit history & scoring ------------------------------------------------

@customers_bp.get('/<customer_id>/credit-history')
def credit_history(customer_id):
    customer = customer_or_404(customer_id)
    if not customer:
        return error('Customer not found.', 404)
    loans = Loan.query.filter_by(customer_id=customer_id).order_by(Loan.applied_at.desc()).all()
    history = []
    payments = []
    for loan in loans:
        history.append({
            'loanId': loan.id,
            'amount': float(loan.amount),
            'status': loan.status,
            'appliedAt': loan.applied_at.isoformat(),
            'installments': [
                {'installment': i.installment, 'dueDate': i.due_date.isoformat(), 'amountDue': float(i.amount_due), 'amountPaid': float(i.amount_paid), 'status': i.status}
                for i in loan.repayment_schedule
            ],
        })
        for d in loan.disbursements:
            payments.append({
                'id': f'disb-{d.id}', 'type': f'Loan Disbursement ({loan.purpose or loan.id})', 'method': d.method,
                'date': d.disbursed_at.isoformat(), 'amount': float(d.amount), 'balanceAfter': None, 'direction': 'out',
            })
        for r in loan.repayments:
            payments.append({
                'id': f'rep-{r.id}', 'type': 'Repayment - Installment', 'method': r.method,
                'date': r.paid_at.isoformat(), 'amount': float(r.amount), 'balanceAfter': None, 'direction': 'in',
            })
    payments.sort(key=lambda p: p['date'], reverse=True)
    return jsonify(customerId=customer_id, loans=history, paymentHistory=payments)


@customers_bp.get('/<customer_id>/credit-score')
def credit_score(customer_id):
    customer = customer_or_404(customer_id)
    if not customer:
        return error('Customer not found.', 404)
    return jsonify(customerId=customer_id, **compute_credit_score(customer_id))
