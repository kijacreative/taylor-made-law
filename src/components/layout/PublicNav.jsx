import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Menu, X, ChevronDown } from 'lucide-react';
import TMLButton from '../ui/TMLButton';

const PublicNav = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Home', path: 'Home' },
    { label: 'Find a Lawyer', path: 'FindLawyer' },
    { label: 'For Attorneys', path: 'ForLawyers' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#faf8f5]/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to={createPageUrl('Home')} className="flex items-center">
            <img 
              src="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp" 
              alt="Taylor Made Law" 
              className="h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={createPageUrl(link.path)}
                className="text-gray-700 hover:text-[#3a164d] font-medium transition-colors relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#a47864] transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link to={createPageUrl('Login')}>
              <TMLButton variant="ghost">Log In</TMLButton>
            </Link>
            <Link to={createPageUrl('FindLawyer')}>
              <TMLButton variant="primary">
                Get Started
              </TMLButton>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-700 hover:text-[#3a164d]"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-6 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={createPageUrl(link.path)}
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-gray-700 hover:text-[#3a164d] font-medium"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 space-y-3">
              <Link to={createPageUrl('Login')} onClick={() => setMobileOpen(false)}>
                <TMLButton variant="outline" className="w-full">Log In</TMLButton>
              </Link>
              <Link to={createPageUrl('FindLawyer')} onClick={() => setMobileOpen(false)}>
                <TMLButton variant="primary" className="w-full">Get Started</TMLButton>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicNav;