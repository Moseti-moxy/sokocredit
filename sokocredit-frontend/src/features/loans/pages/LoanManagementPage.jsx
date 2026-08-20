import { useEffect, useMemo, useState } from 'react'
import { loans as seedLoans } from '../api/loansApi'
import NewLoanForm from '../components/NewLoanForm'
import LoanTable from '../components/LoanTable'

const LOANS_STORAGE_KEY = 'sokocredit-loans'

export default function LoanManagementPage() {
  const [loans, setLoans] = useState(() => {
    const savedLoans = localStorage.getItem(LOANS_STORAGE_KEY)

    if (!savedLoans) return seedLoans

    try {
      const parsedLoans = JSON.parse(savedLoans)
      return Array.isArray(parsedLoans) ? parsedLoans : seedLoans
    } catch {
      return seedLoans
    }
  })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All Status')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(loans))
  }, [loans])

  const shownLoans = useMemo(() => loans.filter((loan) => {
    const matchesSearch = loan.customer.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = status === 'All Status' || (status === 'Overdue' ? loan.status.includes('Overdue') : loan.status === status)
    return matchesSearch && matchesStatus
  }), [loans, search, status])

  const createLoan = (form) => {
    const application = { id: `L-${Date.now().toString().slice(-4)}`, customer: form.customer, initials: form.customer.split(' ').map((part) => part[0]).join('').slice(0, 2), business: 'New Application', amount: Number(form.amount), paid: 0, progress: 0, status: 'Pending', due: 'Awaiting approval' }
    setLoans([application, ...loans])
    setNotice(`Loan application for ${form.customer} created.`)
  }

  return <div className="min-h-screen w-full bg-white">
    <header className="flex h-[84px] items-center border-b border-[#eee] px-5 md:px-[45px]"><a className="flex items-center gap-2 text-2xl font-bold text-[#347705] no-underline" href="#home"><svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9" /><path d="M8 15c.9-1.4 2.2-2 4-2s3.1.6 4 2M9.5 9.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0" /></svg>SokoCredit</a><nav className="mx-auto flex gap-4 md:gap-[38px]"><a className="px-0.5 pb-2.5 pt-7 text-sm text-[#474d47] no-underline" href="#home">Home</a><a className="px-0.5 pb-2.5 pt-7 text-sm text-[#474d47] no-underline" href="#customers">Customers</a><a className="border-b-2 border-[#347705] px-0.5 pb-2.5 pt-7 text-sm font-bold text-[#347705] no-underline" href="#loans">Loans</a><a className="px-0.5 pb-2.5 pt-7 text-sm text-[#474d47] no-underline" href="#analytics">Analytics</a></nav><button aria-label="Notifications" className="grid size-11 place-items-center border-0 bg-white text-[#347705]"><svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg></button></header>
    <main className="px-[18px] py-7 md:px-[45px] md:py-[39px]"><section><h1 className="mb-2 text-[32px] font-bold tracking-[-.7px]">Loan Management</h1><p className="m-0 text-lg text-[#50574f]">Create and track active loans for market traders.</p></section>
      {notice && <div className="mt-5 flex justify-between border border-[#bde0ad] bg-[#eff9e8] px-4 py-3 text-base text-[#286904]">{notice}<button className="border-0 bg-transparent text-xl text-[#286904]" onClick={() => setNotice('')}>×</button></div>}
      <section className="mt-8 grid grid-cols-1 gap-[27px] lg:grid-cols-[340px_1fr]"><NewLoanForm onCreate={createLoan} /><section className="min-w-0"><div className="mb-4 mt-0.5 flex flex-col items-start gap-3.5 md:flex-row md:items-center md:justify-between"><h2 className="m-0 text-2xl font-bold">Active Tracking</h2><div className="flex w-full gap-3 md:w-auto"><label className="flex h-11 flex-1 items-center border border-[#bdc8b6] px-3 text-lg text-[#4f5b4d] md:flex-none">⌕<input className="w-full border-0 pl-2 text-base outline-none md:w-[200px]" placeholder="Search customer..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className="h-11 border border-[#bdc8b6] bg-white px-3 text-base text-[#56606a] outline-[#508d27]" value={status} onChange={(event) => setStatus(event.target.value)}><option>All Status</option><option>On Track</option><option>Overdue</option><option>Due Tomorrow</option><option>Pending</option></select></div></div><LoanTable loans={shownLoans} /></section></section>
    </main>
  </div>
}
