import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { calculateRepayment, generateSchedule } from './api/loansApi'
import { initialState, loanActions, loansReducer } from './slice/loansSlice'
import NewLoanForm from './components/NewLoanForm'
import { DisbursementQueue, PendingQueue } from './components/LoanWorkflow'

const pending = { id: 'L-1', customer: 'Mary Wanjiku', business: 'Fruit Vendor', amount: 10000, duration: 1, status: 'Pending' }

describe('loan calculations', () => {
  it('handles zero duration, high interest, and rounded installments', () => {
    expect(calculateRepayment(10000, 10, 0, 'monthly')).toEqual({ interest: 0, total: 0, installment: 0, installments: 0 })
    expect(calculateRepayment(100, 100, 3, 'monthly')).toMatchObject({ interest: 100, total: 200, installment: 66.67, installments: 3 })
  })
  it('generates the expected number of installments for every frequency', () => {
    expect(generateSchedule({ amount: 1000, interestRate: 10, duration: 2, frequency: 'daily' }).length).toBe(60)
    expect(generateSchedule({ amount: 1000, interestRate: 10, duration: 2, frequency: 'weekly' }).length).toBe(8)
    expect(generateSchedule({ amount: 1000, interestRate: 10, duration: 2, frequency: 'monthly' }).length).toBe(2)
  })
})

describe('loans reducer', () => {
  it('approves, rejects, and disburses loan state changes', () => {
    const state = { ...initialState, loans: [pending] }
    expect(loansReducer(state, loanActions.approve({ id: 'L-1', date: '2026-08-20', conditions: 'Verify stock' })).loans[0].status).toBe('Approved')
    expect(loansReducer(state, loanActions.reject({ id: 'L-1', date: '2026-08-20', reason: 'Incomplete', notes: '' })).loans[0].rejectionReason).toBe('Incomplete')
    expect(loansReducer(state, loanActions.disburse({ id: 'L-1', method: 'M-Pesa', disbursedAt: '2026-08-20' })).loans[0].status).toBe('Repaying')
  })
})

describe('loan workflow UI', () => {
  it('blocks a form submission above the maximum amount', () => {
    render(<NewLoanForm onCreate={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Customer'), { target: { value: 'C-1001' } })
    fireEvent.change(screen.getByLabelText('Amount (KES)'), { target: { value: '500001' } })
    fireEvent.change(screen.getByLabelText('Interest (%)'), { target: { value: '10' } })
    expect(screen.getByRole('button', { name: 'Submit application' })).toBeDisabled()
  })
  it('hides approval actions from an unauthorized role', () => {
    render(<PendingQueue loans={[pending]} role="viewer" onApprove={vi.fn()} onReject={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })
  it('requires a reason to reject an application', () => {
    render(<PendingQueue loans={[pending]} role="manager" onApprove={vi.fn()} onReject={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
    expect(screen.getByRole('button', { name: 'Confirm rejection' })).toBeDisabled()
  })
  it('records a disbursement through the supplied state callback', () => {
    const disburse = vi.fn()
    render(<DisbursementQueue loans={[{ ...pending, status: 'Approved' }]} onDisburse={disburse} />)
    fireEvent.change(screen.getByPlaceholderText('Reference number'), { target: { value: 'MP123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Record disbursement' }))
    expect(disburse).toHaveBeenCalledWith(expect.objectContaining({ id: 'L-1' }), expect.objectContaining({ reference: 'MP123' }))
  })
})
