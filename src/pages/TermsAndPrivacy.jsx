import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';

export default function TermsAndPrivacy() {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />
      <div className="pt-28 pb-20 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-12 pb-8 border-b border-gray-200">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Terms & Conditions and Privacy Policy</h1>
            <p className="text-gray-500 text-sm">Last updated: March 2025 · Taylor Made Law, LLC</p>
          </div>

          {/* Terms & Conditions */}
          <section className="mb-14">
            <h2 className="text-2xl font-bold text-[#3a164d] mb-6">Terms & Conditions</h2>

            <div className="space-y-6 text-gray-700 leading-relaxed">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h3>
                <p>By accessing or using the Taylor Made Law platform ("Platform"), you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the Platform. These terms apply to all users, including attorneys, clients, and visitors.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Description of Services</h3>
                <p>Taylor Made Law, LLC ("Company," "we," "us") operates a legal referral and case management platform that connects clients seeking legal representation with licensed attorneys. We do not provide legal advice or representation and are not a law firm. Any attorney-client relationship is formed solely between the client and the accepting attorney.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Attorney Network Eligibility</h3>
                <p>Attorneys applying to join the Taylor Made Law network must be licensed and in good standing with the applicable state bar(s). By submitting an application, you represent and warrant that all information provided is accurate, current, and complete. Taylor Made Law reserves the right to verify credentials and deny, suspend, or revoke network membership at its sole discretion.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Case Referrals</h3>
                <p>Case referrals provided through the Platform are informational only. Taylor Made Law does not guarantee the accuracy, completeness, or outcome of any case. Attorneys are solely responsible for independently verifying all case information and conducting their own due diligence before accepting any referral.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Fees and Referral Arrangements</h3>
                <p>Any referral fees, co-counsel arrangements, or other compensation structures between attorneys and Taylor Made Law are governed by the separate Referral Agreement. All fee-sharing arrangements comply with applicable Rules of Professional Conduct, including client disclosure requirements.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Prohibited Conduct</h3>
                <p>You agree not to: (a) misrepresent your credentials or case information; (b) use the Platform for any unlawful purpose; (c) interfere with the operation of the Platform; (d) solicit other network members outside of the Platform; or (e) share access credentials with unauthorized parties.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">7. Disclaimer of Warranties</h3>
                <p>The Platform is provided "as is" and "as available" without warranties of any kind. Taylor Made Law expressly disclaims all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">8. Limitation of Liability</h3>
                <p>To the maximum extent permitted by law, Taylor Made Law shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform or any case referral, even if advised of the possibility of such damages.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">9. Termination</h3>
                <p>Taylor Made Law may terminate or suspend your access to the Platform at any time, with or without cause or notice. Upon termination, your right to use the Platform ceases immediately.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">10. Governing Law</h3>
                <p>These Terms are governed by the laws of the State of Florida, without regard to conflict of law principles. Any disputes shall be resolved in the state or federal courts located in Florida.</p>
              </div>
            </div>
          </section>

          {/* Divider */}
          <hr className="border-gray-200 mb-14" />

          {/* Privacy Policy */}
          <section className="mb-14">
            <h2 className="text-2xl font-bold text-[#3a164d] mb-6">Privacy Policy</h2>

            <div className="space-y-6 text-gray-700 leading-relaxed">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Information We Collect</h3>
                <p>We collect information you provide directly, including: name, email address, phone number, bar number, law firm name, states of licensure, practice areas, professional biography, and any other information submitted through our Platform. We may also collect usage data and technical information automatically when you access the Platform.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">2. How We Use Your Information</h3>
                <p>We use your information to: operate and improve the Platform; verify attorney credentials; match clients with appropriate attorneys; communicate with you about your account and case referrals; send administrative notices and updates; and comply with legal obligations.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Information Sharing</h3>
                <p>We do not sell your personal information. We may share information with: attorneys accepting cases (limited to necessary case information); service providers who assist in operating the Platform; and law enforcement or regulators when required by law. Client contact information is only disclosed to attorneys upon case acceptance.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Data Security</h3>
                <p>We implement industry-standard security measures to protect your information, including encryption in transit and at rest. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Data Retention</h3>
                <p>We retain your information for as long as your account is active or as necessary to provide services, comply with legal obligations, resolve disputes, and enforce agreements. Attorney application data is retained for a minimum of 7 years to comply with bar association recordkeeping requirements.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Your Rights</h3>
                <p>You may request access to, correction of, or deletion of your personal information by contacting us at <a href="mailto:privacy@taylormadelaw.com" className="text-[#3a164d] hover:underline">privacy@taylormadelaw.com</a>. Some information may be retained for legal compliance purposes even after a deletion request.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">7. Cookies</h3>
                <p>The Platform uses cookies and similar tracking technologies to enhance your experience, analyze usage, and improve functionality. You may disable cookies in your browser settings, though some features may not function properly as a result.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">8. Contact Us</h3>
                <p>For privacy-related inquiries, contact Taylor Made Law at: <a href="mailto:privacy@taylormadelaw.com" className="text-[#3a164d] hover:underline">privacy@taylormadelaw.com</a></p>
              </div>
            </div>
          </section>

          {/* Back link */}
          <div className="pt-6 border-t border-gray-200">
            <Link to={createPageUrl('JoinNetwork')} className="text-[#3a164d] hover:underline text-sm font-medium">← Back to Application</Link>
          </div>

        </div>
      </div>
      <PublicFooter />
    </div>
  );
}