import React, { useState, useEffect } from 'react';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { verifyEmailOtp, sendEmailOtp } from '@/services/onboarding';
import TMLButton from '@/components/ui/TMLButton';
import TMLInput from '@/components/ui/TMLInput';

export default function EmailVerifyStep({ email, onVerified }) {
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = () => {
    setCooldown(60);
    const iv = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(iv); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSend = async () => {
    setSendLoading(true);
    setError('');
    try {
      const res = await sendEmailOtp({ email });
      if (res.data?.error) { setError(res.data.error); return; }
      setCodeSent(true);
      startCooldown();
    } catch (e) {
      setError('Failed to send code. Please try again.');
    } finally {
      setSendLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setVerifyLoading(true);
    setError('');
    try {
      const res = await verifyEmailOtp({ email, code });
      if (!res.data?.verified) {
        setError(res.data?.error || 'Invalid code. Please try again.');
        return;
      }
      onVerified();
    } catch (e) {
      // Extract error message from axios error response if available
      const msg = e?.response?.data?.error || e?.message || 'Verification failed. Please try again.';
      setError(msg);
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 mx-auto rounded-full bg-[#3a164d]/10 flex items-center justify-center">
        <Mail className="w-10 h-10 text-[#3a164d]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
        <p className="text-gray-500 text-sm">
          We'll send a 6-digit code to <strong>{email}</strong> to verify your identity.
        </p>
      </div>

      {!codeSent ? (
        <TMLButton variant="primary" className="w-full" onClick={handleSend} loading={sendLoading}>
          Send Verification Code
        </TMLButton>
      ) : (
        <div className="space-y-4 text-left">
          <TMLInput
            label="6-Digit Verification Code"
            placeholder="000000"
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g,'').slice(0,6)); setError(''); }}
            className="text-center text-2xl tracking-widest font-mono"
          />

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <TMLButton variant="primary" className="w-full" onClick={handleVerify} loading={verifyLoading}>
            Verify & Continue
          </TMLButton>

          <p className="text-sm text-gray-500 text-center">
            Didn't receive it?{' '}
            {cooldown > 0 ? (
              <span className="text-gray-400">Resend in {cooldown}s</span>
            ) : (
              <button
                onClick={handleSend}
                disabled={sendLoading}
                className="text-[#3a164d] font-semibold hover:underline disabled:opacity-50"
              >
                {sendLoading ? 'Sending...' : 'Resend Code'}
              </button>
            )}
          </p>
        </div>
      )}

      {error && !codeSent && (
        <div className="flex items-center gap-2 p-3 mt-3 bg-red-50 text-red-700 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}