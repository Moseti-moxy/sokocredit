import { createServer } from 'node:http';
import { createLoan, getLoan, listLoans, LoanStatus, updateLoan } from './loans/loanStore.js';
import { createRepaymentSchedule } from './loans/repaymentSchedule.js';

const validFrequencies = new Set(['daily', 'weekly', 'monthly']);

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw new Error('Request body must be valid JSON.'); }
}

function validLoanInput(input) {
  return input.customerId && Number(input.amount) > 0 && Number(input.interestRate) >= 0
    && Number(input.duration) > 0 && validFrequencies.has(input.repaymentFrequency ?? 'monthly');
}

function notFound(response) {
  send(response, 404, { error: 'Loan not found.' });
}

function outstandingBalance(loan) {
  return loan.repaymentSchedule.reduce((sum, item) => sum + item.amountDue - item.amountPaid, 0);
}

export function createApp() {
  return createServer(async (request, response) => {
    if (request.method === 'OPTIONS') return send(response, 204, {});
    const url = new URL(request.url, 'http://localhost');
    const segments = url.pathname.split('/').filter(Boolean);
    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        return send(response, 200, { status: 'ok' });
      }
      if (request.method === 'POST' && url.pathname === '/api/loans') {
        const input = await readJson(request);
        if (!validLoanInput(input)) return send(response, 400, { error: 'customerId, positive amount/duration, non-negative interestRate, and a daily, weekly, or monthly repaymentFrequency are required.' });
        return send(response, 201, { loan: createLoan(input) });
      }
      if (request.method === 'GET' && url.pathname === '/api/loans') {
        return send(response, 200, { loans: listLoans(url.searchParams.get('customerId')) });
      }
      if (segments[0] !== 'api' || segments[1] !== 'loans' || !segments[2]) return send(response, 404, { error: 'Route not found.' });

      const loan = getLoan(segments[2]);
      if (!loan) return notFound(response);
      const action = segments[3];
      if (request.method === 'GET' && !action) return send(response, 200, { loan });

      const body = await readJson(request);
      if (request.method === 'POST' && action === 'approve') {
        if (loan.status !== LoanStatus.PENDING) return send(response, 409, { error: 'Only pending applications can be approved.' });
        const approvedAmount = Number(body.approvedAmount ?? loan.amount);
        if (approvedAmount <= 0) return send(response, 400, { error: 'approvedAmount must be positive.' });
        const terms = {
          amount: approvedAmount,
          interestRate: Number(body.interestRate ?? loan.interestRate),
          duration: Number(body.duration ?? loan.duration),
          durationUnit: body.durationUnit ?? loan.durationUnit,
          repaymentFrequency: body.repaymentFrequency ?? loan.repaymentFrequency,
        };
        if (!validLoanInput({ customerId: loan.customerId, ...terms })) return send(response, 400, { error: 'Invalid approval terms.' });
        return send(response, 200, { loan: updateLoan(loan, {
          ...terms,
          status: LoanStatus.APPROVED,
          decision: { type: 'APPROVED', by: body.approvedBy ?? null, conditions: body.conditions ?? [], decidedAt: new Date().toISOString() },
        }) });
      }
      if (request.method === 'POST' && action === 'reject') {
        if (loan.status !== LoanStatus.PENDING) return send(response, 409, { error: 'Only pending applications can be rejected.' });
        if (!body.reason?.trim()) return send(response, 400, { error: 'A rejection reason is required.' });
        return send(response, 200, { loan: updateLoan(loan, {
          status: LoanStatus.REJECTED,
          decision: { type: 'REJECTED', by: body.rejectedBy ?? null, reason: body.reason.trim(), conditions: body.conditions ?? [], decidedAt: new Date().toISOString() },
        }) });
      }
      if (request.method === 'POST' && action === 'disburse') {
        if (loan.status !== LoanStatus.APPROVED) return send(response, 409, { error: 'Only approved loans can be disbursed.' });
        const amount = Number(body.amount ?? loan.amount);
        if (amount <= 0 || amount > loan.amount) return send(response, 400, { error: 'Disbursement amount must be positive and cannot exceed the approved amount.' });
        const disbursedAt = body.disbursedAt ?? new Date().toISOString();
        const disbursement = { id: crypto.randomUUID(), amount, method: body.method ?? 'bank_transfer', reference: body.reference ?? null, disbursedBy: body.disbursedBy ?? null, disbursedAt };
        const schedule = createRepaymentSchedule({ ...loan, amount, startDate: disbursedAt });
        return send(response, 201, { loan: updateLoan(loan, { status: LoanStatus.ACTIVE, disbursements: [...loan.disbursements, disbursement], repaymentSchedule: schedule }), disbursement });
      }
      if (request.method === 'GET' && action === 'disbursements') return send(response, 200, { disbursements: loan.disbursements });
      if (request.method === 'GET' && action === 'repayment-schedule') return send(response, 200, { repaymentSchedule: loan.repaymentSchedule, outstandingBalance: outstandingBalance(loan) });
      if (request.method === 'POST' && action === 'repayments') {
        if (loan.status !== LoanStatus.ACTIVE) return send(response, 409, { error: 'Repayments can only be recorded on active loans.' });
        let amountLeft = Number(body.amount);
        if (amountLeft <= 0 || amountLeft > outstandingBalance(loan)) return send(response, 400, { error: 'Repayment amount must be positive and no greater than the outstanding balance.' });
        const schedule = loan.repaymentSchedule.map((item) => {
          const unpaid = item.amountDue - item.amountPaid;
          const payment = Math.min(unpaid, amountLeft);
          amountLeft -= payment;
          const amountPaid = Number((item.amountPaid + payment).toFixed(2));
          return { ...item, amountPaid, status: amountPaid === item.amountDue ? 'PAID' : item.status };
        });
        const repayment = { id: crypto.randomUUID(), amount: Number(body.amount), method: body.method ?? 'cash', reference: body.reference ?? null, paidAt: body.paidAt ?? new Date().toISOString() };
        const paidOff = schedule.every((item) => item.status === 'PAID');
        return send(response, 201, { loan: updateLoan(loan, { repaymentSchedule: schedule, repayments: [...loan.repayments, repayment], status: paidOff ? LoanStatus.COMPLETED : LoanStatus.ACTIVE }), repayment });
      }
      if (request.method === 'POST' && action === 'renew') {
        if (![LoanStatus.ACTIVE, LoanStatus.COMPLETED].includes(loan.status)) return send(response, 409, { error: 'Only active or completed loans may be renewed.' });
        const balance = outstandingBalance(loan);
        if (balance > 0 && !body.settleOutstandingBalance) return send(response, 409, { error: 'Outstanding balance must be settled before renewal. Set settleOutstandingBalance to true after collecting it.' });
        const renewal = createLoan({ customerId: loan.customerId, amount: body.amount ?? loan.amount, interestRate: body.interestRate ?? loan.interestRate, duration: body.duration ?? loan.duration, durationUnit: body.durationUnit ?? loan.durationUnit, repaymentFrequency: body.repaymentFrequency ?? loan.repaymentFrequency, purpose: body.purpose ?? loan.purpose, renewalOf: loan.id });
        return send(response, 201, { loan: renewal, renewalOf: loan.id });
      }
      return send(response, 404, { error: 'Route not found.' });
    } catch (error) {
      return send(response, 400, { error: error.message });
    }
  });
}
