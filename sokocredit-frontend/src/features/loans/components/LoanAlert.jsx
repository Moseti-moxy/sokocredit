export function LoanAlert({ notice, onClose }) {
  if (!notice) return null
  const isError = notice.type === 'error'
  return <div role="alert" className={`mt-5 flex items-start justify-between gap-3 border px-4 py-3 text-sm shadow-sm ${isError ? 'border-[#f3b6b3] bg-[#fff3f2] text-[#9f1c17]' : 'border-[#bde0ad] bg-[#eff9e8] text-[#286904]'}`}>
    <span><b className="mr-1">{isError ? 'Action needed:' : 'Success:'}</b>{notice.message}</span><button className="border-0 bg-transparent text-xl leading-none" onClick={onClose} aria-label="Dismiss alert">×</button>
  </div>
}

export function ConfirmationModal({ confirmation, onCancel, onConfirm }) {
  if (!confirmation) return null
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation"><section className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="confirmation-title"><h2 id="confirmation-title" className="m-0 text-xl">{confirmation.title}</h2><p className="mt-3 text-sm text-[#5c635a]">{confirmation.message}</p><div className="mt-6 flex justify-end gap-3"><button className="rounded border border-[#bdc8b6] px-4 py-2 text-sm font-bold" onClick={onCancel}>Cancel</button><button className="rounded bg-[#397d09] px-4 py-2 text-sm font-bold text-white" onClick={onConfirm}>{confirmation.actionLabel}</button></div></section></div>
}
