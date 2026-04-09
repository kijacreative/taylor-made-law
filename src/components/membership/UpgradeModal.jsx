import React from 'react';
import { X, CheckCircle2, Scale, Users, Zap, Lock } from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';

const BENEFITS = [
  { icon: Scale, text: 'Accept & claim high-value case referrals' },
  { icon: Zap, text: 'Post cases directly to the network' },
  { icon: Users, text: 'Access private circle case discussions' },
  { icon: CheckCircle2, text: 'Full Legal Circle case visibility' },
];

export default function UpgradeModal({ onClose, onUpgrade }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#3a164d] to-[#5a2a6d] p-8 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Unlock Full Access</h2>
          <p className="text-white/80 text-sm">Upgrade to a paid membership and get everything the network has to offer.</p>
        </div>

        {/* Price */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-gray-900">$99</span>
          <span className="text-gray-500">/month</span>
          <span className="ml-auto text-xs font-medium bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">Cancel anytime</span>
        </div>

        {/* Benefits */}
        <div className="px-8 py-5 space-y-3">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#3a164d]/10 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-[#3a164d]" />
              </div>
              <span className="text-sm text-gray-700">{text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-8 pb-8 pt-2 space-y-3">
          <TMLButton variant="primary" className="w-full" onClick={onUpgrade}>
            Upgrade Now — $99/month
          </TMLButton>
          <button onClick={onClose} className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors py-1">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}