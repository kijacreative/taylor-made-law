import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AlertCircle } from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-600 mb-8">The page you're looking for doesn't exist or you don't have access to it.</p>
        <Link to={createPageUrl('Home')}>
          <TMLButton variant="primary">Back to Home</TMLButton>
        </Link>
      </div>
    </div>
  );
}