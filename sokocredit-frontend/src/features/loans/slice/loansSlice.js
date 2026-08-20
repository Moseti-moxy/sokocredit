// Dependency-free reducer contract; ready to connect when the shared Redux store arrives.
export const initialState = { loans: [], loading: false, error: null }
export const loanActions = {
  setLoading: (payload) => ({ type: 'loans/setLoading', payload }), setError: (payload) => ({ type: 'loans/setError', payload }), add: (payload) => ({ type: 'loans/add', payload }),
  approve: (payload) => ({ type: 'loans/approve', payload }), reject: (payload) => ({ type: 'loans/reject', payload }), disburse: (payload) => ({ type: 'loans/disburse', payload }),
}
export function loansReducer(state = initialState, action) {
  const replace = (id, changes) => ({ ...state, loans: state.loans.map((loan) => loan.id === id ? { ...loan, ...changes } : loan) })
  switch (action.type) {
    case 'loans/setLoading': return { ...state, loading: action.payload }
    case 'loans/setError': return { ...state, error: action.payload }
    case 'loans/add': return { ...state, loans: [action.payload, ...state.loans] }
    case 'loans/approve': return replace(action.payload.id, { status: 'Approved', approvedAt: action.payload.date, conditions: action.payload.conditions })
    case 'loans/reject': return replace(action.payload.id, { status: 'Rejected', rejectedAt: action.payload.date, rejectionReason: action.payload.reason, rejectionNotes: action.payload.notes })
    case 'loans/disburse': return replace(action.payload.id, { status: 'Repaying', ...action.payload })
    default: return state
  }
}
