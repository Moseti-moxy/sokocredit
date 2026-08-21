const money = (number) => new Intl.NumberFormat('en-KE').format(number)

const avatarClasses = {
  jo: 'bg-[#ffd9d7] text-[#b90a08]',
  sa: 'bg-[#dfe1e4] text-[#62666b]',
}

export default function LoanTable({ loans, onSelect }) {
  return <div className="app-surface overflow-hidden">
    <div className="hidden grid-cols-[1.5fr_.8fr_.8fr_1.15fr_1fr_.9fr] items-center gap-3.5 bg-brand-50 px-4 py-4 text-[11px] font-semibold uppercase tracking-[.4px] text-slate-500 md:grid"><span>Borrower</span><span>Loan type</span><span>Amount</span><span>Progress</span><span>Status</span><span>Next Due Date</span></div>
    {loans.length ? loans.map((loan) => {
      const overdue = loan.status.includes('Overdue')
      const statusClass = overdue ? 'bg-[#ffe0df] text-[#bc1511]' : loan.status === 'On Track' ? 'bg-[#e3f2da] text-[#337609]' : 'bg-[#e7e8e8] text-[#555]'
      const progressColor = overdue ? 'bg-[#dc2721]' : 'bg-[#377b08]'
      const isChamaLoan = loan.loanType === 'chama'
      const borrowerName = isChamaLoan ? loan.chamaName : loan.customer
      return <button type="button" onClick={() => onSelect?.(loan)} className={`grid w-full min-h-[92px] grid-cols-2 items-center gap-4 border-0 border-t border-brand-50 bg-white px-4 py-4 text-left text-sm transition-colors hover:bg-brand-50/40 md:grid-cols-[1.5fr_.8fr_.8fr_1.15fr_1fr_.9fr] md:gap-3.5 ${overdue ? 'border-l-4 border-l-red-500 pl-3' : ''}`} key={loan.id}>
        <div className="col-span-2 flex items-center gap-3 md:col-span-1"><span className={`grid size-10 place-items-center rounded-[9px] bg-[#62a334] text-[15px] font-bold text-[#1f4d0a] ${avatarClasses[loan.initials?.toLowerCase()] || ''}`}>{isChamaLoan ? 'CH' : loan.initials}</span><span><strong className="block text-sm">{borrowerName}</strong><small className="mt-1 block text-[13px] text-[#5c635a]">{isChamaLoan ? `Chairperson: ${loan.customer} · ${loan.id}` : `${loan.business} · ${loan.id}`}</small></span></div>
        <div><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${isChamaLoan ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-700'}`}>{isChamaLoan ? 'Chama group' : 'Individual'}</span></div>
        <div><strong className="block text-sm">KES {money(loan.amount)}</strong><small className="mt-1 block text-[13px] text-[#5c635a]">KES {money(loan.paid)} Paid</small></div>
        <div><div className="flex items-center gap-2"><b className={`text-[13px] ${overdue ? 'text-[#cc251e]' : 'text-[#378008]'}`}>{loan.progress}%</b><span className={`h-1.5 flex-1 overflow-hidden rounded-full ${overdue ? 'bg-[#ffd9d7]' : 'bg-[#e5e6e8]'}`}><i className={`block h-full rounded-full ${progressColor}`} style={{ width: `${loan.progress}%` }} /></span></div><small className={`mt-1 block text-[13px] ${overdue ? 'text-[#cc251e]' : 'text-[#5c635a]'}`}>{loan.progress < 50 ? 'Follow Up' : 'Repayment Progress'}</small></div>
        <div><span className={`whitespace-nowrap rounded-sm px-2 py-1.5 text-[13px] ${statusClass}`}>{loan.status}</span></div><time className="text-[13px] md:text-sm">{loan.due}</time>
      </button>
    }) : <div className="p-10 text-center text-[#687068]">No loans match this filter.</div>}
  </div>
}
