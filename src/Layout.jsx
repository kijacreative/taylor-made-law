import React from 'react';

// Simple pass-through layout - public pages handle their own nav/footer
// Authenticated pages use sidebar components directly
export default function Layout({ children, currentPageName }) {
  return (
    <>
      <style>{`
        :root {
          /* Taylor Made Law Brand Colors */
          --tml-primary: #3a164d;
          --tml-primary-dark: #2a1038;
          --tml-primary-light: #5a2a6d;
          --tml-accent: #a47864;
          --tml-accent-light: #c49b8a;
          --tml-background: #faf8f5;
          --tml-background-cream: #f8f8f8;
          --tml-text: #333333;
          --tml-text-light: #666666;
          --tml-text-muted: #999999;
        }
        
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background-color: var(--tml-background);
          color: var(--tml-text);
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #c9c9c9;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* Focus styles */
        *:focus-visible {
          outline: 2px solid var(--tml-primary);
          outline-offset: 2px;
        }
        
        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
      {children}
    </>
  );
}