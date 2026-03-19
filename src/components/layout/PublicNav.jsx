import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Menu, X, ChevronDown } from 'lucide-react';
import TMLButton from '../ui/TMLButton';

const PublicNav = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [contentDropdownOpen, setContentDropdownOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  React.useEffect(() => {
    const checkAuth = async () => {
      const auth = await base44.auth.isAuthenticated();
      setIsAuthenticated(auth);
    };
    checkAuth();
  }, []);

  const navLinks = [
    { label: 'Find a Lawyer', path: 'FindLawyer' },
    { label: 'Join the Attorney Network', path: 'JoinNetwork' },
  ];

  const contentLinks = [
    { label: 'Blog Posts', path: 'Blog' },
    { label: 'White Papers', href: '/Blog?type=whitepaper' },
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
                key={link.label}
                to={link.href || createPageUrl(link.path)}
                className="text-gray-700 hover:text-[#3a164d] font-medium transition-colors relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#a47864] transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
            
            {/* Content Dropdown */}
            <div className="relative">
              <button
                onClick={() => setContentDropdownOpen(!contentDropdownOpen)}
                className="text-gray-700 hover:text-[#3a164d] font-medium transition-colors flex items-center gap-2 relative group"
              >
                Content
                <ChevronDown className={`w-4 h-4 transition-transform ${contentDropdownOpen ? 'rotate-180' : ''}`} />
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#a47864] transition-all duration-300 group-hover:w-full" />
              </button>
              
              {contentDropdownOpen && (
                <div className="absolute top-full mt-2 left-0 w-48 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden animate-slideDown">
                  {contentLinks.map((link) => (
                    <Link 
                      key={link.label}
                      to={link.href || createPageUrl(link.path)}
                      className="block px-4 py-3 text-gray-700 hover:bg-[#3a164d] hover:text-white transition-colors first:border-t-0 border-t border-gray-100"
                      onClick={() => setContentDropdownOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <Link to={createPageUrl('LawyerDashboard')}>
                <TMLButton variant="ghost">My Dashboard</TMLButton>
              </Link>
            ) : (
              <Link to={createPageUrl('LawyerLogin')}>
                <TMLButton variant="ghost">Attorney Login</TMLButton>
              </Link>
            )}
            <div className="relative">
              <TMLButton 
                variant="primary"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2"
              >
                Get Fitted
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </TMLButton>
              
              {dropdownOpen && (
                <div className="absolute top-full mt-2 right-0 w-56 bg-[#3a164d] rounded-2xl shadow-xl overflow-hidden animate-slideDown">
                  <Link 
                    to={createPageUrl('FindLawyer')}
                    className="block px-6 py-3 text-white hover:bg-[#2a1038] transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Find a Lawyer
                  </Link>
                  <Link 
                    to={createPageUrl('JoinNetwork')}
                    className="block px-6 py-3 text-white hover:bg-[#2a1038] transition-colors border-t border-white/10"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Join the Network
                  </Link>
                </div>
              )}
            </div>
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
                key={link.label}
                to={link.href || createPageUrl(link.path)}
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-gray-700 hover:text-[#3a164d] font-medium"
              >
                {link.label}
              </Link>
            ))}
            
            {/* Mobile Content Dropdown */}
            <div>
              <button
                onClick={() => setContentDropdownOpen(!contentDropdownOpen)}
                className="w-full text-left py-2 text-gray-700 hover:text-[#3a164d] font-medium flex items-center justify-between"
              >
                Content
                <ChevronDown className={`w-4 h-4 transition-transform ${contentDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {contentDropdownOpen && (
                <div className="pl-4 space-y-2 mt-2">
                  {contentLinks.map((link) => (
                    <Link
                      key={link.label}
                      to={link.href || createPageUrl(link.path)}
                      onClick={() => { setMobileOpen(false); setContentDropdownOpen(false); }}
                      className="block py-2 text-gray-600 hover:text-[#3a164d]"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            <div className="pt-4 space-y-3">
              {isAuthenticated ? (
                <Link to={createPageUrl('LawyerDashboard')} onClick={() => setMobileOpen(false)}>
                  <TMLButton variant="outline" className="w-full">My Dashboard</TMLButton>
                </Link>
              ) : (
                <Link to={createPageUrl('LawyerLogin')} onClick={() => setMobileOpen(false)} className="block">
                  <TMLButton variant="outline" className="w-full">Attorney Login</TMLButton>
                </Link>
              )}
              <Link to={createPageUrl('FindLawyer')} onClick={() => setMobileOpen(false)}>
                <TMLButton variant="primary" className="w-full">Find a Lawyer</TMLButton>
              </Link>
              <Link to={createPageUrl('JoinNetwork')} onClick={() => setMobileOpen(false)}>
                <TMLButton variant="primary" className="w-full">Join the Network</TMLButton>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicNav;