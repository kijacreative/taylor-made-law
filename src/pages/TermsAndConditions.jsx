import React from 'react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />
      <div className="pt-28 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-[#3a164d] mb-2">Terms & Conditions</h1>
          <p className="text-gray-500 mb-10">Last updated: March 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p>By accessing or using the Taylor Made Law platform ("Platform"), you agree to be bound by these Terms & Conditions ("Terms"). If you do not agree to these Terms, you may not use the Platform. These Terms apply to all visitors, users, and attorneys who access or use the Platform.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Description of Services</h2>
              <p>Taylor Made Law operates a legal referral network that connects clients seeking legal representation with licensed attorneys. The Platform facilitates introductions between clients and attorneys but does not itself provide legal advice or legal services. Taylor Made Law is not a law firm.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. Attorney Network Membership</h2>
              <p>Attorneys who join the Taylor Made Law Network ("Network") must:</p>
              <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
                <li>Be licensed and in good standing with their respective state bar(s)</li>
                <li>Maintain professional liability (malpractice) insurance</li>
                <li>Agree to the Network Referral Agreement</li>
                <li>Provide accurate and complete profile information</li>
                <li>Promptly respond to case referrals and client inquiries</li>
                <li>Comply with all applicable rules of professional conduct</li>
              </ul>
              <p className="mt-3">Taylor Made Law reserves the right to approve, reject, suspend, or remove any attorney from the Network at its sole discretion.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Referral Fees</h2>
              <p>Attorneys participating in the Network agree to pay referral fees as outlined in the Network Referral Agreement. Referral fees are due upon successful case acceptance and are non-refundable except as explicitly provided in the Referral Agreement. Taylor Made Law reserves the right to update its fee schedule with reasonable advance notice to Network members.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Client Use</h2>
              <p>Clients using the Platform to find legal representation acknowledge that:</p>
              <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
                <li>Taylor Made Law does not guarantee the quality of legal services provided by any attorney</li>
                <li>Any attorney-client relationship is formed solely between the client and the attorney</li>
                <li>Taylor Made Law is not a party to any legal services agreement between a client and an attorney</li>
                <li>They should conduct their own due diligence before retaining any attorney</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. User Accounts</h2>
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify Taylor Made Law immediately of any unauthorized use of your account. Taylor Made Law is not liable for any loss or damage arising from your failure to protect your account credentials.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Prohibited Conduct</h2>
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
                <li>Use the Platform for any unlawful purpose</li>
                <li>Provide false or misleading information</li>
                <li>Solicit clients outside of the Platform in violation of the Referral Agreement</li>
                <li>Interfere with or disrupt the Platform's operation</li>
                <li>Attempt to gain unauthorized access to any part of the Platform</li>
                <li>Use the Platform to transmit spam, malware, or other harmful content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Intellectual Property</h2>
              <p>All content on the Platform, including text, graphics, logos, and software, is the property of Taylor Made Law or its licensors and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without express written permission from Taylor Made Law.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Disclaimer of Warranties</h2>
              <p>The Platform is provided "as is" and "as available" without warranties of any kind, either express or implied. Taylor Made Law does not warrant that the Platform will be uninterrupted, error-free, or free of viruses or other harmful components. We do not warrant the accuracy, completeness, or usefulness of any information on the Platform.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Limitation of Liability</h2>
              <p>To the fullest extent permitted by law, Taylor Made Law shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Platform. Our total liability for any claim arising out of these Terms shall not exceed the amounts paid by you to Taylor Made Law in the twelve (12) months preceding the claim.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">11. Indemnification</h2>
              <p>You agree to indemnify, defend, and hold harmless Taylor Made Law and its officers, directors, employees, and agents from any claims, damages, losses, and expenses (including reasonable attorneys' fees) arising out of your use of the Platform or violation of these Terms.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">12. Modifications to Terms</h2>
              <p>Taylor Made Law reserves the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on the Platform with a new "Last updated" date. Your continued use of the Platform after any changes constitutes your acceptance of the new Terms.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">13. Governing Law</h2>
              <p>These Terms are governed by the laws of the State of Texas, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the state or federal courts located in Texas, and you consent to the exclusive jurisdiction of such courts.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">14. Contact Us</h2>
              <p>If you have questions about these Terms, please contact us at:</p>
              <div className="mt-3 p-4 bg-white rounded-xl border border-gray-200">
                <p className="font-semibold text-gray-900">Taylor Made Law</p>
                <p>Email: <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline">support@taylormadelaw.com</a></p>
                <p>Website: <a href="https://taylormadelaw.com" className="text-[#3a164d] hover:underline">taylormadelaw.com</a></p>
              </div>
            </section>

          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}