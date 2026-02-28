import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const PublicFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1a1a1a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <img 
              src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Logo_Stacked_Cream-scaled.png" 
              alt="Taylor Made Law" 
              className="h-20 w-auto mb-4"
            />
            <p className="text-gray-400 text-sm leading-relaxed">
              Your Digital Tailor for a Better Legal Fit. Connecting clients with qualified attorneys nationwide.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link to={createPageUrl('Home')} className="text-gray-400 hover:text-[#a47864] transition-colors text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link to={createPageUrl('FindLawyer')} className="text-gray-400 hover:text-[#a47864] transition-colors text-sm">
                  Find a Lawyer
                </Link>
              </li>
              <li>
                <Link to={createPageUrl('ForLawyers')} className="text-gray-400 hover:text-[#a47864] transition-colors text-sm">
                  For Attorneys
                </Link>
              </li>
              <li>
                <Link to={createPageUrl('Blog')} className="text-gray-400 hover:text-[#a47864] transition-colors text-sm">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <span className="text-gray-400 text-sm">Privacy Policy</span>
              </li>
              <li>
                <span className="text-gray-400 text-sm">Terms of Service</span>
              </li>
              <li>
                <span className="text-gray-400 text-sm">Attorney Advertising</span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li>support@taylormadelaw.com</li>
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <p className="text-gray-500 text-xs leading-relaxed mb-6">
            <strong>Legal Disclaimer:</strong> Taylor Made Law is a lawyer referral and marketing service, not a law firm. 
            We connect individuals seeking legal representation with qualified attorneys in our network. 
            The information provided on this website is for general informational purposes only and should not be construed as legal advice. 
            An attorney-client relationship is not formed until you retain an attorney. 
            Results may vary depending on the specific circumstances of your case.
          </p>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {currentYear} Taylor Made Law. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm">
              Attorney Advertising • Prior results do not guarantee similar outcomes
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;