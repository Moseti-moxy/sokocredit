import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { createStripeIntent } from '../features/loans/api/customerLoansApi';

let stripePromise;
function getStripe() {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
}

function PayButton({ onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    setSubmitting(false);
    if (error) { onError(error.message || 'Payment failed. Please try again.'); return; }
    if (paymentIntent?.status === 'succeeded') onSuccess();
    else onError('Payment did not complete. Please try again.');
  }

  return (
    <button type="button" onClick={handlePay} disabled={!stripe || submitting}
      className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60">
      {submitting ? 'Processing…' : 'Pay with card'}
    </button>
  );
}

/** Mounts Stripe's PaymentElement for one loan/amount. amountKES is converted
 * to US cents since the backend's payment-intent endpoint defaults to usd. */
export default function CustomerStripePayment({ loanId, amountKES, onSuccess, onError }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [error, setError] = useState('');
  const stripe = getStripe();

  useEffect(() => {
    if (!stripe || !amountKES || amountKES <= 0) return;
    createStripeIntent(loanId, { amount: Math.round(amountKES * 100), currency: 'usd' })
      .then((data) => { setClientSecret(data.clientSecret); setError(''); })
      .catch((err) => setError(err?.response?.data?.error || 'Could not start the card payment. Please try again.'));
  }, [stripe, loanId, amountKES]);

  if (!stripe) return <p className="mt-4 text-sm text-amber-700">Card payments are not configured yet. Ask an administrator to set VITE_STRIPE_PUBLISHABLE_KEY.</p>;
  if (error) return <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>;
  if (!clientSecret) return <p className="mt-4 text-sm text-slate-500">Preparing card payment…</p>;

  function handleError(message) {
    setError(message);
    onError?.(message);
  }

  return (
    <Elements stripe={stripe} options={{ clientSecret }}>
      <PaymentElement />
      <PayButton onSuccess={onSuccess} onError={handleError} />
    </Elements>
  );
}
