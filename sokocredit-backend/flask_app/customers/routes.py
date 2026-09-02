from datetime import date

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from app.audit import log_action
from app.extensions import db
from app.models import Loan
from app.mpesa import MpesaError, normalize_phone_number
from app.security import blind_index, role_required
from .models import CUSTOMER_STATUSES, DOCUMENT_TYPES, Customer, Document
from .scoring import compute_credit_score
from .storage import delete_customer_file, save_customer_file

customers_bp = Blueprint('customers', __name__, url_prefix='/api/customers')

REQUIRED_FIELDS = ('fullName', 'phoneNumber', 'nationalId', 'businessName', 'market', 'stallNumber', 'dailyTurnover')


def error(message, status=400):
    return jsonify(error=message), status


def body():
    return request.get_json(silent=True) or {}


def is_blank(value):
    return value is None or not str(value).strip()


def coordinate(value, *, minimum, maximum):
    """Return a finite coordinate within its geographic range."""
    try:
        result = float(value)
    except (TypeError, ValueError):
        raise ValueError('Invalid coordinates.')
    if not minimum <= result <= maximum:
        raise ValueError('Invalid coordinates.')
    return result


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
        customer.phone_number = normalize_phone_number(values['phoneNumber'])
        customer.phone_number_hash = blind_index(customer.phone_number)
    if 'nationalId' in values:
        customer.national_id = values['nationalId']
        customer.national_id_hash = blind_index(values['nationalId'])
    if 'email' in values:
        customer.email = values['email']
        customer.email_hash = blind_index(values['email']) if values['email'] else None
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
        customer.latitude = coordinate(values['latitude'], minimum=-90, maximum=90)
    if 'longitude' in values:
        customer.longitude = coordinate(values['longitude'], minimum=-180, maximum=180)
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
@role_required('admin', 'lender', 'agent')
def create_customer():
    """
    Create a customer
    ---
    tags: [Customers]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [fullName, phoneNumber, nationalId, businessName, market, stallNumber, dailyTurnover]
          properties:
            fullName: {type: string, example: Jane Wanjiru}
            phoneNumber: {type: string, example: '0712345678'}
            nationalId: {type: string, example: '29874561'}
            businessName: {type: string, example: "Jane's Fresh Produce"}
            market: {type: string, example: Marikiti}
            stallNumber: {type: string, example: B-14}
            dailyTurnover: {type: number, example: 5000}
            dailyProfit: {type: number, example: 1200}
            yearsInBusiness: {type: integer, example: 3}
            kraPin: {type: string}
            chama: {type: string}
            nextOfKin: {type: string}
            relationship: {type: string}
            nextOfKinPhone: {type: string}
            appraisalNotes: {type: string}
    responses:
      201: {description: Customer created}
      400: {description: Missing or invalid field}
      409: {description: A customer with this phone number or national ID already exists}
    """
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
    missing = [f for f in REQUIRED_FIELDS if is_blank(values.get(f))]
    if missing:
        return error(f'Missing required field(s): {", ".join(missing)}.')

    try:
        values['phoneNumber'] = normalize_phone_number(values['phoneNumber'])
        # Coordinates are optional during onboarding, but if one is supplied
        # both must be present so a customer cannot be plotted at (0, 0).
        has_latitude = values.get('latitude') is not None
        has_longitude = values.get('longitude') is not None
        if has_latitude != has_longitude:
            return error('Latitude and longitude must be provided together.')
        if has_latitude:
            values['latitude'] = coordinate(values['latitude'], minimum=-90, maximum=90)
            values['longitude'] = coordinate(values['longitude'], minimum=-180, maximum=180)
    except MpesaError as exc:
        return error(str(exc))
    except ValueError:
        return error('Latitude or longitude is invalid.')

    # Phone numbers and national IDs identify one real person. Checking both
    # prevents the same customer being silently registered twice by different
    # field officers using different phone-number formats. Both fields are
    # encrypted at rest, so the check runs against their blind-index hashes
    # rather than the ciphertext (see app.security.blind_index).
    national_id = str(values['nationalId']).strip()
    if Customer.query.filter(
        db.or_(
            Customer.phone_number_hash == blind_index(values['phoneNumber']),
            Customer.national_id_hash == blind_index(national_id),
        )
    ).first():
        return error('A customer with this phone number or national ID already exists.', 409)

    customer = Customer(
        full_name=values['fullName'], phone_number=values['phoneNumber'], phone_number_hash=blind_index(values['phoneNumber']),
        national_id=national_id, national_id_hash=blind_index(national_id),
        business_name=values['businessName'], market=values.get('market'), stall_number=values.get('stallNumber'),
        years_in_business=values.get('yearsInBusiness') or 0, daily_turnover=values.get('dailyTurnover') or 0,
    )
    try:
        apply_fields(customer, values)
        if customer.latitude is not None and customer.longitude is not None:
            customer.registered_lat = customer.latitude
            customer.registered_lng = customer.longitude
        db.session.add(customer)
        log_action('CREATE_CUSTOMER', 'Customer', customer.id, {'market': customer.market})
        db.session.commit()
    except (ValueError, TypeError, MpesaError):
        db.session.rollback()
        return error('One or more fields are invalid.')
    except IntegrityError:
        # Retain a friendly response if two agents submit the same customer at
        # exactly the same time.
        db.session.rollback()
        return error('A customer with this phone number or national ID already exists.', 409)
    return jsonify(customer=serialize_customer(customer)), 201


@customers_bp.get('')
@role_required('admin', 'lender', 'agent')
def list_customers():
    """
    List customers
    ---
    tags: [Customers]
    security: [{Bearer: []}]
    parameters:
      - in: query
        name: status
        type: string
        required: false
      - in: query
        name: market
        type: string
        required: false
      - in: query
        name: search
        type: string
        required: false
        description: Matches against name or business name (substring), or an exact phone number
    responses:
      200: {description: Array of customers}
    """
    query = Customer.query.order_by(Customer.created_at.desc())
    if status := request.args.get('status'):
        query = query.filter_by(status=status)
    if market := request.args.get('market'):
        query = query.filter_by(market=market)
    if search := request.args.get('search'):
        # phone_number/national_id are encrypted at rest, so ciphertext can't be
        # substring-matched in SQL. Name/business stay searchable by substring;
        # phone numbers are matched exactly via their blind-index hash instead.
        like = f'%{search}%'
        conditions = [Customer.full_name.ilike(like), Customer.business_name.ilike(like)]
        try:
            conditions.append(Customer.phone_number_hash == blind_index(normalize_phone_number(search)))
        except MpesaError:
            pass
        query = query.filter(db.or_(*conditions))
    return jsonify(customers=[serialize_customer(c) for c in query.all()])


@customers_bp.get('/<customer_id>')
@role_required('admin', 'lender', 'agent')
def get_customer(customer_id):
    """
    Get a customer by id
    Includes the customer's documents.
    ---
    tags: [Customers]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: customer_id
        type: string
        required: true
    responses:
      200: {description: The customer, with documents}
      404: {description: Customer not found}
    """
    customer = customer_or_404(customer_id)
    return error('Customer not found.', 404) if not customer else jsonify(customer=serialize_customer(customer, include_documents=True))


@customers_bp.patch('/<customer_id>')
@role_required('admin', 'lender', 'agent')
def update_customer(customer_id):
    """
    Update a customer
    Any subset of the create-customer fields may be sent.
    ---
    tags: [Customers]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: customer_id
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            fullName: {type: string}
            phoneNumber: {type: string}
            businessName: {type: string}
            market: {type: string}
            stallNumber: {type: string}
            dailyTurnover: {type: number}
            dailyProfit: {type: number}
            status: {type: string}
    responses:
      200: {description: Updated customer}
      400: {description: Validation error}
      404: {description: Customer not found}
      409: {description: A customer with this phone number already exists}
    """
    customer = customer_or_404(customer_id)
    if not customer:
        return error('Customer not found.', 404)
    values = body()
    new_phone = values.get('phoneNumber')
    if new_phone:
        try:
            new_phone = normalize_phone_number(new_phone)
            values['phoneNumber'] = new_phone
        except MpesaError as exc:
            return error(str(exc))
    if new_phone and new_phone != customer.phone_number and Customer.query.filter_by(phone_number_hash=blind_index(new_phone)).first():
        return error('A customer with this phone number already exists.', 409)
    try:
        apply_fields(customer, values)
        log_action('UPDATE_CUSTOMER', 'Customer', customer.id, {'fields': list(values.keys())})
    except (ValueError, TypeError):
        return error('One or more fields are invalid.')
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error('A customer with this phone number or national ID already exists.', 409)
    return jsonify(customer=serialize_customer(customer))


@customers_bp.delete('/<customer_id>')
@role_required('admin', 'lender')
def deactivate_customer(customer_id):
    """
    Deactivate a customer
    Soft-delete: customers with loan history should never be hard-deleted.
    ---
    tags: [Customers]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: customer_id
        type: string
        required: true
    responses:
      200: {description: Customer marked INACTIVE}
      404: {description: Customer not found}
    """
    customer = customer_or_404(customer_id)
    if not customer:
        return error('Customer not found.', 404)
    customer.status = 'INACTIVE'
    log_action('DEACTIVATE_CUSTOMER', 'Customer', customer.id)
    db.session.commit()
    return jsonify(customer=serialize_customer(customer))


# ---- Documents --------------------------------------------------------------

@customers_bp.post('/<customer_id>/documents')
@role_required('admin', 'lender', 'agent')
def upload_document(customer_id):
    """
    Upload a document for a customer
    multipart/form-data, not JSON.
    ---
    tags: [Customers]
    security: [{Bearer: []}]
    consumes: [multipart/form-data]
    parameters:
      - in: path
        name: customer_id
        type: string
        required: true
      - in: formData
        name: file
        type: file
        required: true
      - in: formData
        name: documentType
        type: string
        required: true
      - in: formData
        name: uploadedBy
        type: string
        required: false
    responses:
      201: {description: Document created}
      400: {description: Missing file or invalid documentType}
      404: {description: Customer not found}
    """
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
    log_action('UPLOAD_DOCUMENT', 'Customer', customer.id, {'documentType': document_type})
    db.session.commit()
    return jsonify(document=serialize_document(document)), 201


@customers_bp.get('/<customer_id>/documents')
@role_required('admin', 'lender', 'agent')
def list_documents(customer_id):
    """
    List a customer's documents
    ---
    tags: [Customers]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: customer_id
        type: string
        required: true
    responses:
      200: {description: Array of documents}
      404: {description: Customer not found}
    """
    customer = customer_or_404(customer_id)
    if not customer:
        return error('Customer not found.', 404)
    return jsonify(documents=[serialize_document(d) for d in customer.documents])


@customers_bp.delete('/<customer_id>/documents/<document_id>')
@role_required('admin', 'lender')
def delete_document(customer_id, document_id):
    """
    Delete a customer's document
    ---
    tags: [Customers]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: customer_id
        type: string
        required: true
      - in: path
        name: document_id
        type: string
        required: true
    responses:
      204: {description: Document deleted}
      404: {description: Document not found}
    """
    document = db.session.get(Document, document_id)
    if not document or document.customer_id != customer_id:
        return error('Document not found.', 404)
    delete_customer_file(document.storage_path)
    db.session.delete(document)
    log_action('DELETE_DOCUMENT', 'Customer', customer_id, {'documentId': document_id})
    db.session.commit()
    return '', 204


# ---- Credit history & scoring ------------------------------------------------

@customers_bp.get('/<customer_id>/credit-history')
@role_required('admin', 'lender', 'agent')
def credit_history(customer_id):
    """
    Get a customer's loan and payment history
    ---
    tags: [Customers]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: customer_id
        type: string
        required: true
    responses:
      200: {description: Loans and paymentHistory arrays}
      404: {description: Customer not found}
    """
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
@role_required('admin', 'lender', 'agent')
def credit_score(customer_id):
    """
    Get a customer's computed credit score
    ---
    tags: [Customers]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: customer_id
        type: string
        required: true
    responses:
      200: {description: Credit score details}
      404: {description: Customer not found}
    """
    customer = customer_or_404(customer_id)
    if not customer:
        return error('Customer not found.', 404)
    return jsonify(customerId=customer_id, **compute_credit_score(customer_id))


# ---- GPS route optimization (optional feature) ------------------------------

@customers_bp.get('/route-optimize')
@role_required('admin', 'lender', 'agent')
def route_optimize():
    """
    Order a set of customers into an efficient visit route from a starting point
    Nearest-neighbour heuristic over great-circle distance - see app/geo.py.
    ---
    tags: [Customers]
    security: [{Bearer: []}]
    parameters:
      - in: query
        name: startLat
        type: number
        required: true
      - in: query
        name: startLng
        type: number
        required: true
      - in: query
        name: market
        type: string
        required: false
        description: Restrict to customers in this market
    responses:
      200: {description: Ordered stops with per-leg and total distance in km}
      400: {description: startLat/startLng missing or invalid}
    """
    from app.geo import optimize_route

    try:
        start = {'latitude': float(request.args['startLat']), 'longitude': float(request.args['startLng'])}
    except (KeyError, ValueError):
        return error('startLat and startLng are required and must be valid numbers.')
    query = Customer.query.filter_by(status='ACTIVE')
    if market := request.args.get('market'):
        query = query.filter_by(market=market)
    stops = [{'id': c.id, 'name': c.full_name, 'latitude': c.latitude, 'longitude': c.longitude} for c in query.all()]
    ordered, total_km = optimize_route(start, stops)
    return jsonify(route=ordered, totalDistanceKm=total_km)


# ---- External lookups (optional features - see app/crb.py, app/business_registry.py) ----

@customers_bp.post('/<customer_id>/crb-check')
@role_required('admin', 'lender')
def crb_check(customer_id):
    """
    Run a Credit Reference Bureau check for a customer
    Requires a commercial data-sharing agreement with a licensed CRB - see app/crb.py.
    ---
    tags: [Customers]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: customer_id
        type: string
        required: true
    responses:
      200: {description: Normalized CRB result}
      404: {description: Customer not found}
      502: {description: CRB API error}
      503: {description: CRB not configured}
    """
    from app.crb import CrbConfigurationError, CrbError, check_customer
    from app.models import ExternalLookup

    customer = customer_or_404(customer_id)
    if not customer:
        return error('Customer not found.', 404)
    try:
        result = check_customer(national_id=customer.national_id, full_name=customer.full_name)
    except CrbConfigurationError as exc:
        db.session.add(ExternalLookup(provider='CRB', customer_id=customer.id, status='NOT_CONFIGURED'))
        db.session.commit()
        return error(str(exc), 503)
    except CrbError as exc:
        db.session.add(ExternalLookup(provider='CRB', customer_id=customer.id, status='FAILED'))
        db.session.commit()
        return error(str(exc), 502)
    db.session.add(ExternalLookup(provider='CRB', customer_id=customer.id, status='SUCCESS', result_summary={'score': result['score'], 'rating': result['rating']}))
    log_action('CRB_CHECK', 'Customer', customer.id)
    db.session.commit()
    return jsonify(result)


@customers_bp.post('/<customer_id>/business-registry-check')
@role_required('admin', 'lender')
def business_registry_check(customer_id):
    """
    Look up a customer's business registration record
    Requires a Kenya eCitizen/BRS API consumer agreement - see app/business_registry.py.
    ---
    tags: [Customers]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: customer_id
        type: string
        required: true
    responses:
      200: {description: Business registry record, or null if not found}
      400: {description: Customer has no businessRegistrationNumber on file}
      404: {description: Customer not found}
      502: {description: Registry API error}
      503: {description: Registry not configured}
    """
    from app.business_registry import BusinessRegistryConfigurationError, BusinessRegistryError, lookup_business
    from app.models import ExternalLookup

    customer = customer_or_404(customer_id)
    if not customer:
        return error('Customer not found.', 404)
    if not customer.business_registration_number:
        return error('This customer has no businessRegistrationNumber on file.')
    try:
        result = lookup_business(customer.business_registration_number)
    except BusinessRegistryConfigurationError as exc:
        db.session.add(ExternalLookup(provider='BUSINESS_REGISTRY', customer_id=customer.id, status='NOT_CONFIGURED'))
        db.session.commit()
        return error(str(exc), 503)
    except BusinessRegistryError as exc:
        db.session.add(ExternalLookup(provider='BUSINESS_REGISTRY', customer_id=customer.id, status='FAILED'))
        db.session.commit()
        return error(str(exc), 502)
    db.session.add(ExternalLookup(provider='BUSINESS_REGISTRY', customer_id=customer.id, status='SUCCESS', result_summary=result))
    log_action('BUSINESS_REGISTRY_CHECK', 'Customer', customer.id)
    db.session.commit()
    return jsonify(result=result)
