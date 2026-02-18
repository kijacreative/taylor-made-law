import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const STEPS = [
  { label: 'Account' },
  { label: 'Verify Email' },
  { label: 'Practice' },
  { label: 'Bio & Referrals' },
  { label: 'Agreements' },
];

export default function StepProgress({ currentStep }) {
  return (
    <div className="flex items-center justify-center mb-10 px-2 overflow-x-auto">
      {STEPS.map((s, i) => {
        const num = i + 1;
        const done = currentStep > num;
        const active = currentStep === num;
        return (
          <React.Fragment key={num}>
            <div className="flex flex-col items-center min-w-[52px]">
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm transition-all duration-300 ${
                  done
                    ? 'bg-[#3a164d] text-white'
                    : active
                    ? 'bg-[#3a164d] text-white ring-4 ring-[#3a164d]/20'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : num}
              </div>
              <span
                className={`mt-1.5 text-[10px] font-medium text-center whitespace-nowrap ${
                  active ? 'text-[#3a164d]' : done ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mt-[-18px] rounded transition-all duration-300 ${
                  currentStep > num ? 'bg-[#3a164d]' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}