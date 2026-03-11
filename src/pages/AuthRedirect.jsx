import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

// This page handles post-login redirection based on user role
export default function AuthRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const redirect = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          navigate(createPageUrl('LawyerLogin'));
          return;
        }

        const user = await base44.auth.me();
        
        // Check user type and redirect accordingly
        if (user.user_type === 'admin' || user.user_type === 'senior_associate' || user.user_type === 'junior_associate' || user.role === 'admin') {
          navigate(createPageUrl('AdminDashboard'));
        } else {
          navigate(createPageUrl('LawyerDashboard'));
        }
      } catch (e) {
        navigate(createPageUrl('Home'));
      }
    };

    redirect();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7e277e] mx-auto mb-4" />
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}