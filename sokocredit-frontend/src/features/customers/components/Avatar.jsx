export default function Avatar({ customer, large = false }) { return <div className={`avatar ${customer.colour} ${large ? 'large' : ''}`}>{customer.initials}</div> }
