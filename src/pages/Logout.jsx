import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2, LogOut } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';

export default function Logout() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('logging_out');

  useEffect(() => {
    const performLogout = async () => {
      try {
        await base44.auth.logout();
        setStatus('success');
        setTimeout(() => {
          navigate(createPageUrl('Home'), { replace: true });
        }, 1500);
      } catch (err) {
        console.error('Logout error:', err);
        setStatus('error');
        setTimeout(() => {
          navigate(createPageUrl('Home'), { replace: true });
        }, 2000);
      }
    };

    performLogout();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />
      <div className="flex items-center justify-center min-h-screen px-4 pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
            {status === 'logging_out' && (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-[#3a164d] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Signing Out</h2>
                <p className="text-gray-600">Please wait while we log you out...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                  <LogOut className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Signed Out</h2>
                <p className="text-gray-600">You've been successfully logged out. Redirecting...</p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                  <LogOut className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Logout Complete</h2>
                <p className="text-gray-600">Redirecting to home...</p>
              </>
            )}
          </div>
        </motion.div>
      </div>
      <PublicFooter />
    </div>
  );
}