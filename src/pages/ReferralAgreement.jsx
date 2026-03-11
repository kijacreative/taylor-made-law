import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';

export default function ReferralAgreement() {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />
      <div className="pt-28 pb-20 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-12 pb-8 border-b border-gray-200">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Attorney Referral Agreement</h1>
            <p className="text-gray-500 text-sm">Last updated: March 2025 · Taylor Made Law, LLC</p>
          </div>

          <div className="space-y-8 text-gray-700 leading-relaxed">

            <div className="bg-[#f5f0fa] border border-[#3a164d]/20 rounded-xl p-6">
              <p className="text-sm text-[#3a164d] font-medium">
                This Referral Agreement ("Agreement") is entered into between Taylor Made Law, LLC ("Taylor Made Law") and the attorney or law firm applying to join the network ("Attorney"). By accepting this Agreement, Attorney agrees to the terms set forth below governing case referrals, fee arrangements, and professional obligations.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Purpose and Scope</h3>
              <p>Taylor Made Law operates a legal referral platform that connects prospective clients with licensed attorneys. This Agreement governs the terms under which Taylor Made Law refers potential clients ("Referrals") to Attorney and the compensation structure for accepted referrals.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Nature of the Relationship</h3>
              <p>Taylor Made Law is not a law firm and does not provide legal services. Attorney is an independent contractor and not an employee, partner, or agent of Taylor Made Law. Taylor Made Law makes no representations or warranties regarding the quality, merit, or outcome of any referred case. The attorney-client relationship is formed solely between Attorney and the referred client.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Referral Process</h3>
              <p>Taylor Made Law will provide Attorney with case information through the Platform for cases matching Attorney's stated practice areas and licensed states. Attorney has sole discretion to accept or decline any referral. Upon accepting a case, Attorney agrees to: (a) contact the referred client within 24 hours; (b) conduct an independent evaluation of the case; and (c) maintain regular communication with Taylor Made Law regarding case status.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Referral Fee</h3>
              <p>In consideration for case referrals, Attorney agrees to pay Taylor Made Law a referral fee as follows:</p>
              <ul className="list-disc ml-6 mt-3 space-y-2">
                <li>The referral fee shall be a percentage of the gross attorney's fees recovered, as specified in the separate fee schedule provided to Attorney upon network approval.</li>
                <li>No referral fee is owed unless and until Attorney receives attorney's fees from the referred matter.</li>
                <li>Referral fees are due within 30 days of Attorney's receipt of attorney's fees.</li>
                <li>Attorney shall maintain accurate records of all fees received on referred matters and provide documentation upon request.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Bar Rules Compliance</h3>
              <p>This Agreement is intended to comply with applicable Rules of Professional Conduct governing attorney referral fees and fee-sharing arrangements. Attorney represents and warrants that: (a) Attorney is licensed and in good standing in all states where Attorney will accept referrals; (b) Attorney will make all required disclosures to clients regarding this referral arrangement; (c) Attorney will obtain any required client consent; and (d) Attorney will comply with all applicable ethical rules in accepting and handling referred matters.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Client Disclosure</h3>
              <p>Attorney agrees to disclose the existence and terms of this referral arrangement to each referred client as required by applicable Rules of Professional Conduct. Taylor Made Law will provide a standard disclosure template, and Attorney may use or adapt this template to satisfy applicable ethical requirements.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">7. Case Reporting</h3>
              <p>Attorney agrees to: (a) update case status in the Platform within 5 business days of any material development; (b) notify Taylor Made Law if a referred client declines representation; (c) notify Taylor Made Law upon case resolution and the amount of attorney's fees received; and (d) respond to Taylor Made Law inquiries regarding referred matters within 48 hours.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">8. Confidentiality</h3>
              <p>Attorney agrees to maintain the confidentiality of: (a) Taylor Made Law's proprietary client matching methodology and Platform functionality; (b) non-public information regarding other network attorneys; and (c) any Taylor Made Law business information designated as confidential. This obligation survives termination of this Agreement.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">9. Non-Solicitation</h3>
              <p>During the term of this Agreement and for 12 months following termination, Attorney agrees not to directly solicit clients referred through the Platform for matters outside of the original referral scope without Taylor Made Law's prior written consent.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">10. Term and Termination</h3>
              <p>This Agreement commences upon Attorney's acceptance and continues until terminated by either party upon 30 days' written notice. Taylor Made Law may terminate this Agreement immediately for cause, including but not limited to: bar discipline, material misrepresentation, failure to pay referral fees, or conduct detrimental to Taylor Made Law's reputation. Termination does not relieve Attorney of obligations for fees owed on pre-termination referrals.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">11. Indemnification</h3>
              <p>Attorney agrees to indemnify, defend, and hold harmless Taylor Made Law and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from: (a) Attorney's representation of referred clients; (b) Attorney's breach of this Agreement; or (c) Attorney's violation of applicable professional conduct rules.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">12. Amendments</h3>
              <p>Taylor Made Law reserves the right to amend this Agreement upon 30 days' written notice. Continued use of the Platform following notice of amendment constitutes acceptance of the amended terms.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">13. Entire Agreement</h3>
              <p>This Agreement, together with the Terms & Conditions and any fee schedule provided separately, constitutes the entire agreement between the parties regarding case referrals and supersedes any prior understandings or agreements.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">14. Contact</h3>
              <p>Questions regarding this Agreement may be directed to: <a href="mailto:legal@taylormadelaw.com" className="text-[#3a164d] hover:underline">legal@taylormadelaw.com</a></p>
            </div>

          </div>

          {/* Back link */}
          <div className="pt-10 border-t border-gray-200">
            <Link to={createPageUrl('JoinNetwork')} className="text-[#3a164d] hover:underline text-sm font-medium">← Back to Application</Link>
          </div>

        </div>
      </div>
      <PublicFooter />
    </div>
  );
}