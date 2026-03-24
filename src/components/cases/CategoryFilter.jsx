import React from 'react';

const CATEGORIES = [
  {
    key: '',
    label: 'All Cases',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" opacity="0.8"/>
        <rect x="22" y="6" width="12" height="12" rx="2" fill="currentColor" opacity="0.6"/>
        <rect x="6" y="22" width="12" height="12" rx="2" fill="currentColor" opacity="0.6"/>
        <rect x="22" y="22" width="12" height="12" rx="2" fill="currentColor" opacity="0.8"/>
      </svg>
    ),
    color: '#3a164d',
    bg: 'from-[#3a164d] to-[#5a2a6d]',
  },
  {
    key: 'Criminal',
    label: 'Criminal',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
        <path d="M20 4L6 10v10c0 8.28 5.96 16.02 14 18 8.04-1.98 14-9.72 14-18V10L20 4z" fill="currentColor" opacity="0.85"/>
        <path d="M15 20l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#b91c1c',
    bg: 'from-[#b91c1c] to-[#ef4444]',
  },
  {
    key: 'Family',
    label: 'Family',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
        <circle cx="14" cy="12" r="5" fill="currentColor" opacity="0.9"/>
        <circle cx="26" cy="12" r="5" fill="currentColor" opacity="0.7"/>
        <path d="M4 32c0-5.52 4.48-10 10-10s10 4.48 10 10" fill="currentColor" opacity="0.9"/>
        <path d="M22 32c0-4.42 3.58-8 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
      </svg>
    ),
    color: '#0369a1',
    bg: 'from-[#0369a1] to-[#0ea5e9]',
  },
  {
    key: 'Estate',
    label: 'Estate',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
        <path d="M20 4L8 14v22h24V14L20 4z" fill="currentColor" opacity="0.8"/>
        <rect x="15" y="22" width="10" height="14" rx="1" fill="white" opacity="0.7"/>
        <rect x="10" y="14" width="20" height="3" rx="1" fill="white" opacity="0.5"/>
      </svg>
    ),
    color: '#78350f',
    bg: 'from-[#78350f] to-[#d97706]',
  },
  {
    key: 'Personal Injury',
    label: 'Personal Injury',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
        <circle cx="20" cy="10" r="6" fill="currentColor" opacity="0.85"/>
        <path d="M12 36v-8l-4-6a2 2 0 013.2-2.4L14 23V16a2 2 0 014 0v8h4V16a2 2 0 014 0v7l2.8-3.4A2 2 0 0132 22l-4 6v8H12z" fill="currentColor" opacity="0.8"/>
      </svg>
    ),
    color: '#065f46',
    bg: 'from-[#065f46] to-[#10b981]',
  },
  {
    key: 'Mass Torts',
    label: 'Mass Torts',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
        <circle cx="12" cy="16" r="5" fill="currentColor" opacity="0.7"/>
        <circle cx="28" cy="16" r="5" fill="currentColor" opacity="0.7"/>
        <circle cx="20" cy="10" r="5" fill="currentColor" opacity="0.9"/>
        <path d="M6 34c0-4.42 2.69-8 6-8m16 8c0-4.42-2.69-8-6-8m-2 0c-2.21 0-4 2.69-4 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      </svg>
    ),
    color: '#7c3aed',
    bg: 'from-[#7c3aed] to-[#a78bfa]',
  },
  {
    key: 'Class Actions',
    label: 'Class Actions',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
        <rect x="8" y="8" width="24" height="24" rx="3" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2"/>
        <path d="M14 20h12M20 14v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    color: '#0f766e',
    bg: 'from-[#0f766e] to-[#14b8a6]',
  },
];

export { CATEGORIES };

export default function CategoryFilter({ activeCategory, cases, onSelect }) {
  const countFor = (key) => {
    if (!key) return cases.length;
    return cases.filter(c => {
      const pa = (c.practice_area || '').toLowerCase();
      return pa.includes(key.toLowerCase());
    }).length;
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.key;
        const count = countFor(cat.key);

        return (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={`flex flex-col items-center gap-2 group transition-all duration-200 ${isActive ? 'scale-105' : 'hover:scale-105'}`}
          >
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 bg-gradient-to-br ${cat.bg} shadow-md ${
                isActive ? 'ring-4 ring-white ring-offset-2 shadow-lg' : 'group-hover:shadow-lg'
              }`}
            >
              <div style={{ color: 'white' }}>
                {cat.svg}
              </div>
            </div>
            <div className="text-center">
              <p className={`text-xs font-semibold leading-tight ${isActive ? 'text-[#3a164d]' : 'text-gray-700'}`}>
                {cat.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{count} case{count !== 1 ? 's' : ''}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}