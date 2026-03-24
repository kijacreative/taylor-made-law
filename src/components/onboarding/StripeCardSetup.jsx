import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, Lock } from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';

const CARD_STYLE = {
  style: {
    base: {
      fontSize: '15px',
      color: '#1a1a1a',
      fontFamily: 'Inter, system-ui, sans-serif',
      '::placeholder': { color: '#aab7c4' },
    },
    invalid: { color: '#e53e3e' }
  }
};

function CardForm({ onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  useEffect(() => {
    const fetchIntent = async () => {
      const res = await base44.functions.invoke('createSetupIntent', {});
      if (res.data?.client_secret) {
        setClientSecret(res.data.client_secret);
      } else {
        setError(res.data?.error || 'Failed to initialize payment setup.');
      }
      setLoading(false);
    };
    fetchIntent();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;
    setSubmitting(true);
    setError('');

    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: { name: cardholderName }
      }
    });

    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
    } else {
      onSuccess(result.setupIntent.payment_method);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Cardholder Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={cardholderName}
          onChange={e => setCardholderName(e.target.value)}
          placeholder="Jane Smith"
          required
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d] text-sm transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Details <span className="text-red-500">*</span></label>
        <div className="w-full px-4 py-3.5 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-[#3a164d]/20 focus-within:border-[#3a164d] transition-all">
          <CardElement options={CARD_STYLE} />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Lock className="w-3 h-3" />
        <span>Secured by Stripe. Your card details are encrypted and never stored on our servers.</span>
      </div>

      <TMLButton
        type="submit"
        variant="primary"
        loading={submitting}
        disabled={!stripe || !cardholderName.trim()}
        className="w-full"
      >
        Save Card & Continue <CheckCircle2 className="w-4 h-4 ml-1" />
      </TMLButton>
    </form>
  );
}

export default function StripeCardSetup({ publishableKey, onSuccess }) {
  const [stripePromise] = useState(() => publishableKey ? loadStripe(publishableKey) : null);

  return (
    <Elements stripe={stripePromise}>
      <CardForm onSuccess={onSuccess} />
    </Elements>
  );
}