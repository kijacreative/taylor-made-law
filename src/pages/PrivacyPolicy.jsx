import React from 'react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />
      <div className="pt-28 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-[#3a164d] mb-2">Privacy Policy</h1>
          <p className="text-gray-500 mb-10">Last updated: March 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
              <p>Taylor Made Law ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at app.taylormadelaw.com and related services (collectively, the "Platform"). Please read this policy carefully. If you disagree with its terms, please discontinue use of the Platform.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
              <p className="font-semibold text-gray-800">Information You Provide Directly</p>
              <ul className="list-disc list-inside space-y-2 mt-2 mb-4 ml-4">
                <li>Account registration information (name, email address, password)</li>
                <li>Attorney profile information (firm name, bar numbers, states licensed, practice areas, biography)</li>
                <li>Client intake information (name, contact details, description of legal matter)</li>
                <li>Communications you send through the Platform</li>
                <li>Billing and payment information</li>
                <li>Referral agreement acceptance records</li>
              </ul>
              <p className="font-semibold text-gray-800">Information Collected Automatically</p>
              <ul className="list-disc list-inside space-y-2 mt-2 ml-4">
                <li>Log data (IP address, browser type, pages visited, time spent)</li>
                <li>Device information (operating system, device identifiers)</li>
                <li>Usage data (features used, actions taken within the Platform)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
                <li>Create and manage your account</li>
                <li>Match clients with appropriate attorneys in the Network</li>
                <li>Facilitate case referrals and communications</li>
                <li>Process membership fees and referral payments</li>
                <li>Send transactional emails and Platform notifications</li>
                <li>Verify attorney credentials and bar memberships</li>
                <li>Improve and develop the Platform</li>
                <li>Comply with legal obligations</li>
                <li>Prevent fraud and enforce our Terms & Conditions</li>
                <li>Send marketing communications (with your consent)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. How We Share Your Information</h2>
              <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
              <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
                <li><strong>Between Clients and Attorneys:</strong> When a case referral is made, relevant client information is shared with the accepting attorney and vice versa.</li>
                <li><strong>Service Providers:</strong> We work with third-party vendors (e.g., email delivery, payment processors, cloud hosting) who process data on our behalf under confidentiality agreements.</li>
                <li><strong>Legal Compliance:</strong> We may disclose information when required by law, court order, or government authority.</li>
                <li><strong>Business Transfers:</strong> If Taylor Made Law is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
                <li><strong>With Your Consent:</strong> We may share information with third parties when you have given us explicit permission to do so.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Attorney Profile Information</h2>
              <p>Attorney profiles on the Platform may be visible to other Network members and, in some cases, to clients seeking legal representation. This includes your name, firm name, practice areas, states licensed, biography, and profile photo. By creating a profile, you consent to this information being displayed within the Platform for the purpose of facilitating referrals.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Retention</h2>
              <p>We retain your personal information for as long as your account is active or as needed to provide you with our services. We may also retain certain information as required by law, for legitimate business purposes (such as resolving disputes and enforcing agreements), or as described in this Policy. When information is no longer needed, we securely delete or anonymize it.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Cookies and Tracking</h2>
              <p>We use cookies and similar technologies to enhance your experience on the Platform. Cookies help us keep you logged in, remember your preferences, and analyze how the Platform is used. You can control cookie settings through your browser, but disabling cookies may affect Platform functionality.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Data Security</h2>
              <p>We implement industry-standard security measures to protect your information, including encryption in transit (TLS/SSL), secure data storage, and access controls. However, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security and encourage you to use strong, unique passwords and keep your account credentials confidential.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Your Rights and Choices</h2>
              <p>Depending on your location, you may have the following rights regarding your personal information:</p>
              <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information, subject to certain exceptions</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails at any time via the unsubscribe link</li>
                <li><strong>Data Portability:</strong> Request your data in a portable format where technically feasible</li>
              </ul>
              <p className="mt-3">To exercise these rights, contact us at <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline">support@taylormadelaw.com</a>.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Children's Privacy</h2>
              <p>The Platform is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that we have collected personal information from a child under 18, we will take steps to delete that information promptly.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">11. Third-Party Links</h2>
              <p>The Platform may contain links to third-party websites or services. We are not responsible for the privacy practices of those third parties and encourage you to review their privacy policies before providing any personal information.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">12. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new Policy on this page with an updated "Last updated" date. We encourage you to review this Policy periodically. Your continued use of the Platform after any changes constitutes acceptance of the updated Policy.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">13. Contact Us</h2>
              <p>If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:</p>
              <div className="mt-3 p-4 bg-white rounded-xl border border-gray-200">
                <p className="font-semibold text-gray-900">Taylor Made Law — Privacy Team</p>
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