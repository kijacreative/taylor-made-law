import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  CheckCircle2, XCircle, AlertCircle, Clock, ChevronDown, ChevronUp,
  Loader2, RotateCcw, Download, Filter, ExternalLink, User, Shield
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';

// ── UAT Test Matrix ─────────────────────────────────────────────────────────
const UAT_TESTS = [
  {
    section: 'Find a Lawyer (Public Lead Intake)',
    color: 'blue',
    tests: [
      {
        id: 'FAL-01',
        role: 'Anonymous',
        scenario: 'Anonymous user submits lead via Find a Lawyer form',
        steps: [
          'Navigate to /FindLawyer as a logged-out user',
          'Complete Step 1: select Practice Area and State',
          'Complete Step 2: enter case description (20+ chars)',
          'Complete Step 3: enter contact info, accept consent',
          'Click "Submit Request"',
        ],
        expected: 'Success screen shown. Lead saved in DB with status=new, sync_status=pending/sent.',
        link: '/FindLawyer',
        blocking: true,
      },
      {
        id: 'FAL-02',
        role: 'System',
        scenario: 'Lead is saved locally before Lead Docket sync',
        steps: [
          'After FAL-01 submission',
          'Open Admin > Leads queue',
          'Find the new lead by email',
          'Verify lead exists with status=new',
        ],
        expected: 'Lead record exists in DB. Fields populated: first_name, last_name, email, phone, state, practice_area, consent_given=true.',
        link: '/AdminLeads',
        blocking: true,
      },
      {
        id: 'FAL-03',
        role: 'System',
        scenario: 'Lead Docket sync status recorded',
        steps: [
          'Open Admin > Lead Detail for the submitted lead',
          'Check "Lead Docket Sync" panel in sidebar',
          'Verify sync_status is "sent" or "failed" (not "pending")',
        ],
        expected: 'sync_status = sent (or failed with error message visible). last_sync_attempt_at is set.',
        link: '/AdminLeads',
        blocking: false,
      },
      {
        id: 'FAL-04',
        role: 'System',
        scenario: 'Confirmation email sent to submitter',
        steps: [
          'After FAL-01, check inbox for uat-lead@test.com (or test email used)',
          'Verify email received with subject "We Received Your Request"',
          'Verify email content shows practice area, state, urgency summary',
        ],
        expected: 'Branded confirmation email received within 60 seconds. TML logo visible. No raw HTML errors.',
        link: null,
        blocking: false,
      },
      {
        id: 'FAL-05',
        role: 'System',
        scenario: 'Admin alert email sent on new lead',
        steps: [
          'Check admin email inbox after FAL-01 submission',
          'Verify email received with subject "🔔 New Lead: [name] — [practice area]"',
          'Verify CTA links to /AdminLeads (not a broken URL)',
        ],
        expected: 'Admin receives alert email with correct lead details. CTA links to correct admin route.',
        link: null,
        blocking: false,
      },
    ],
  },
  {
    section: 'Join Attorney Network (Self-Application)',
    color: 'purple',
    tests: [
      {
        id: 'JAN-01',
        role: 'Attorney (New)',
        scenario: 'New attorney applies through canonical join flow',
        steps: [
          'Navigate to /JoinNetwork as logged-out user',
          'Complete all 4 steps of the application form',
          'Submit with unique test email (e.g. uat-apply-new@test.com)',
        ],
        expected: 'Application submitted. Success screen shown. LawyerApplication record created with status=pending.',
        link: '/JoinNetwork',
        blocking: true,
      },
      {
        id: 'JAN-02',
        role: 'System',
        scenario: 'Applicant receives confirmation email',
        steps: [
          'After JAN-01, check inbox for the applicant email',
          'Verify subject "Your Application Has Been Received"',
          'Verify email body includes "what happens next" steps',
        ],
        expected: 'Branded confirmation email received. No broken links. Logo visible.',
        link: null,
        blocking: false,
      },
      {
        id: 'JAN-03',
        role: 'System',
        scenario: 'Admin receives new application alert',
        steps: [
          'Check admin inbox after JAN-01',
          'Verify admin alert email received with applicant name',
          'Verify CTA link points to /AdminLawyers (not /AdminLawyerApplications)',
        ],
        expected: 'Admin alert email with applicant details received. CTA links to /AdminLawyers.',
        link: null,
        blocking: false,
      },
      {
        id: 'JAN-04',
        role: 'Attorney (Duplicate)',
        scenario: 'Re-apply with same email does not create duplicate',
        steps: [
          'Submit application again using the same email as JAN-01',
          'Verify the submission succeeds (no error)',
          'Check DB: still only 1 LawyerApplication record for that email',
          'Verify User record not duplicated',
        ],
        expected: 'Application updates existing record. No duplicate User or LawyerApplication created. Status not downgraded.',
        link: '/JoinNetwork',
        blocking: true,
      },
    ],
  },
  {
    section: 'Admin Approval Flow',
    color: 'green',
    tests: [
      {
        id: 'APR-01',
        role: 'Admin',
        scenario: 'Admin opens /AdminLawyers and sees pending applicant',
        steps: [
          'Log in as admin',
          'Navigate to /AdminLawyers',
          'Verify UAT Pending Attorney (uat-pending@test.com) appears',
          'Filter by status=pending to confirm',
        ],
        expected: 'Pending applicant visible. All details (name, firm, bar number, states, practice areas) displayed correctly.',
        link: '/AdminLawyers',
        blocking: true,
      },
      {
        id: 'APR-02',
        role: 'Admin',
        scenario: 'Admin approves pending lawyer application',
        steps: [
          'Open the UAT Pending Attorney record',
          'Click Approve (optionally set free trial months)',
          'Confirm success message shown',
          'Verify LawyerApplication status changes to approved',
          'Verify User record created/updated with user_status=approved',
        ],
        expected: 'Application approved. ActivationToken created. User record status=approved.',
        link: '/AdminLawyers',
        blocking: true,
      },
      {
        id: 'APR-03',
        role: 'System',
        scenario: 'Approval activation email sent to lawyer',
        steps: [
          'After APR-02, check uat-pending@test.com inbox',
          'Verify email subject "You\'re Approved — Set Up Your Taylor Made Law Account"',
          'Verify CTA button text: "Set Your Password & Access Portal"',
          'Verify CTA link points to /Activate?token=... (NOT /login)',
          'Verify link has token parameter',
        ],
        expected: 'Activation email received with correct CTA. Link format: https://app.taylormadelaw.com/Activate?token=[token]',
        link: null,
        blocking: true,
      },
      {
        id: 'APR-04',
        role: 'Attorney (Newly Approved)',
        scenario: 'Lawyer clicks activation link and sets password',
        steps: [
          'Click activation link from APR-03 email',
          'Verify /Activate page loads correctly',
          'Enter a secure password (8+ chars, letters + numbers)',
          'Accept Terms & Conditions and Privacy Policy',
          'Click "Activate My Account"',
          'Verify redirect to /LawyerLogin?activated=1',
          'Verify green "Account activated!" banner on login page',
        ],
        expected: 'Account activated. Password set. Redirect to login with success banner.',
        link: '/Activate',
        blocking: true,
      },
      {
        id: 'APR-05',
        role: 'Attorney (Newly Approved)',
        scenario: 'Activated lawyer can log in and access dashboard',
        steps: [
          'On /LawyerLogin, enter uat-pending@test.com and newly set password',
          'Click Sign In',
          'Verify redirect to /LawyerDashboard',
          'Verify no "Account Disabled" or "Pending" banners',
          'Verify user_status = approved in user record',
        ],
        expected: 'Login succeeds. Dashboard loads. No disabled/blocked screens. User sees full approved experience.',
        link: '/LawyerLogin',
        blocking: true,
      },
    ],
  },
  {
    section: 'Admin Invite Flow',
    color: 'indigo',
    tests: [
      {
        id: 'INV-01',
        role: 'Admin',
        scenario: 'Admin invites a new attorney',
        steps: [
          'Navigate to /AdminLawyers',
          'Click "Invite Attorney"',
          'Enter test details: email=uat-new-invite@test.com, name, firm',
          'Submit invitation',
          'Verify success message',
          'Verify User record created with user_status=invited, entry_source=invite',
        ],
        expected: 'Invitation created. User record exists with invited status. ActivationToken created.',
        link: '/AdminLawyers',
        blocking: true,
      },
      {
        id: 'INV-02',
        role: 'System',
        scenario: 'Invite email sent with correct activation link',
        steps: [
          'Check uat-new-invite@test.com inbox',
          'Verify email subject contains "Invited to the Taylor Made Law Network"',
          'Verify CTA text: "Activate Your Account →" (NOT "Sign In to Your Account")',
          'Verify CTA link: /Activate?token=[token] (NOT /LawyerLogin)',
          'Verify token is present in URL',
        ],
        expected: 'Invite email CTA points to /Activate?token=... Link is valid for 7 days.',
        link: null,
        blocking: true,
      },
      {
        id: 'INV-03',
        role: 'Attorney (Invited)',
        scenario: 'Invited attorney activates via link',
        steps: [
          'Click activation link from INV-02 email',
          'Complete activation (set password, accept terms)',
          'Log in successfully',
        ],
        expected: 'Account activated. Login works. user_status becomes approved after activation.',
        link: '/Activate',
        blocking: true,
      },
      {
        id: 'INV-04',
        role: 'Attorney (Invited then Applies)',
        scenario: 'Invited user later self-applies — no duplicate created',
        steps: [
          'Go to /JoinNetwork with uat-new-invite@test.com',
          'Submit full application',
          'Verify: only 1 User record exists for that email',
          'Verify: entry_source updates to "both"',
          'Verify: user_status not downgraded if already approved/invited',
        ],
        expected: 'No duplicate user. entry_source="both". Status precedence respected (approved > pending > invited).',
        link: '/JoinNetwork',
        blocking: true,
      },
    ],
  },
  {
    section: 'Lawyer Permissions — Pending vs Approved',
    color: 'amber',
    tests: [
      {
        id: 'PRM-01',
        role: 'Attorney (Pending)',
        scenario: 'Pending lawyer sees teasers only on case exchange',
        steps: [
          'Log in as a pending lawyer',
          'Navigate to /CaseExchange',
          'Verify case cards show title and practice area',
          'Verify "Details locked after approval" message shown',
          'Verify clicking a case does NOT reveal client contact info',
        ],
        expected: 'Pending lawyer sees teasers. No client contact info visible. Locked state UI shown.',
        link: '/CaseExchange',
        blocking: true,
      },
      {
        id: 'PRM-02',
        role: 'Attorney (Approved)',
        scenario: 'Approved lawyer sees full case details',
        steps: [
          'Log in as uat-approved@test.com',
          'Navigate to /CaseExchange',
          'Verify all 3 seeded cases visible',
          'Click any case',
          'Verify full description, estimated value, and "Accept Case" button visible',
        ],
        expected: 'Full case details visible. Estimated values shown. Accept button present.',
        link: '/CaseExchange',
        blocking: true,
      },
      {
        id: 'PRM-03',
        role: 'Attorney (Approved)',
        scenario: 'Approved lawyer can accept a case',
        steps: [
          'On /CaseExchange, click a published case',
          'Click "Accept Case" button',
          'Verify confirmation dialog or success state',
          'Check /MyCases — verify case appears with status=accepted',
        ],
        expected: 'Case accepted. Case status updates to accepted. Appears in My Cases.',
        link: '/CaseExchange',
        blocking: true,
      },
      {
        id: 'PRM-04',
        role: 'Attorney (Approved)',
        scenario: 'Approved lawyer can access resources',
        steps: [
          'Navigate to /LawyerResources',
          'Verify both seeded resources visible (Referral Agreement + Onboarding Guide)',
          'Click a resource link',
          'Verify external link opens',
        ],
        expected: '2 seeded resources visible. Links work. No access denied errors.',
        link: '/LawyerResources',
        blocking: false,
      },
      {
        id: 'PRM-05',
        role: 'Attorney (Approved)',
        scenario: 'Approved lawyer can create/join a Legal Circle',
        steps: [
          'Navigate to /Groups',
          'Click "Create Group"',
          'Fill in group name, type, and settings',
          'Submit — verify group created',
          'Verify creator is added as admin member',
        ],
        expected: 'Group created successfully. Creator appears as admin in member list.',
        link: '/Groups',
        blocking: false,
      },
    ],
  },
  {
    section: 'Disabled / Rejected Flows',
    color: 'red',
    tests: [
      {
        id: 'DIS-01',
        role: 'Admin',
        scenario: 'Admin disables an approved lawyer',
        steps: [
          'Navigate to /AdminLawyers',
          'Find uat-approved@test.com',
          'Click Disable/Suspend',
          'Confirm action',
          'Verify user_status changes to disabled',
          'Verify AuditLog entry created',
        ],
        expected: 'User record user_status=disabled. Audit log entry present.',
        link: '/AdminLawyers',
        blocking: true,
      },
      {
        id: 'DIS-02',
        role: 'Attorney (Disabled)',
        scenario: 'Disabled lawyer login is blocked',
        steps: [
          'Attempt to log in as uat-approved@test.com after disabling',
          'Enter correct email and password',
          'Verify login is blocked with TML-branded "Account Disabled" screen',
          'Verify no redirect to Base44 default error pages',
        ],
        expected: 'Custom TML "Account Disabled" screen shown. support@taylormadelaw.com contact link visible.',
        link: '/LawyerLogin',
        blocking: true,
      },
      {
        id: 'DIS-03',
        role: 'Attorney (Disabled)',
        scenario: 'Disabled lawyer cannot re-apply to bypass block',
        steps: [
          'As disabled user, navigate to /JoinNetwork',
          'Submit application using uat-approved@test.com email',
          'Verify error message returned',
          'Verify user_status remains disabled (not upgraded to pending)',
        ],
        expected: 'Application returns friendly error. Status NOT changed. Block preserved.',
        link: '/JoinNetwork',
        blocking: true,
      },
      {
        id: 'DIS-04',
        role: 'Admin',
        scenario: 'Admin rejects a pending application',
        steps: [
          'Open a pending LawyerApplication in /AdminLawyers',
          'Click Reject, enter rejection reason',
          'Verify application status=rejected',
          'Verify rejection email sent to applicant with reason included',
        ],
        expected: 'Application status=rejected. Rejection email received by applicant. Reason visible in email.',
        link: '/AdminLawyers',
        blocking: false,
      },
    ],
  },
  {
    section: 'Password Reset Flow',
    color: 'teal',
    tests: [
      {
        id: 'PWD-01',
        role: 'Attorney',
        scenario: 'Forgot password — request reset link',
        steps: [
          'Navigate to /LawyerLogin',
          'Click "Forgot password?"',
          'Enter uat-approved@test.com email',
          'Click "Send Reset Link"',
          'Verify success screen shown (enumeration-safe)',
        ],
        expected: 'Success screen shown regardless of email. Branded TML UI. No Base44 native screens.',
        link: '/ForgotPassword',
        blocking: true,
      },
      {
        id: 'PWD-02',
        role: 'System',
        scenario: 'Reset email received with correct link',
        steps: [
          'Check inbox for uat-approved@test.com',
          'Verify email subject "Reset Your Taylor Made Law Password"',
          'Verify CTA: "Reset My Password →"',
          'Verify link format: /ResetPassword?token=[token] (NOT /login)',
          'Verify link is not expired',
        ],
        expected: 'Reset email received. CTA links to /ResetPassword?token=... (not /login or /forgot-password).',
        link: null,
        blocking: true,
      },
      {
        id: 'PWD-03',
        role: 'Attorney',
        scenario: 'Click reset link and set new password',
        steps: [
          'Click reset link from PWD-02',
          'Verify /ResetPassword page loads with form',
          'Enter new password',
          'Submit',
          'Verify redirect to /LawyerLogin?reset=1',
          'Verify "Password updated!" blue banner visible',
        ],
        expected: 'New password set. Redirect to login with blue success banner.',
        link: '/ResetPassword',
        blocking: true,
      },
      {
        id: 'PWD-04',
        role: 'Attorney',
        scenario: 'Expired reset token shows correct error state',
        steps: [
          'Manually navigate to /ResetPassword?token=invalid_token_xyz',
          'Verify TML-branded error screen (not Base44 system error)',
          'Verify resend option available',
          'Verify no raw error details exposed to user',
        ],
        expected: 'TML branded "Reset Link Expired/Invalid" screen. Option to request new link. No system errors visible.',
        link: '/ResetPassword?token=invalid_uat_test',
        blocking: true,
      },
    ],
  },
];

const STATUS_OPTIONS = ['untested', 'pass', 'fail', 'blocked', 'skip'];

const STATUS_STYLES = {
  untested: { bg: 'bg-gray-100', text: 'text-gray-500', icon: Clock, label: 'Untested' },
  pass:     { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2, label: 'Pass' },
  fail:     { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Fail' },
  blocked:  { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertCircle, label: 'Blocked' },
  skip:     { bg: 'bg-gray-50', text: 'text-gray-400', icon: Clock, label: 'Skip' },
};

const SECTION_COLORS = {
  blue:   { badge: 'bg-blue-100 text-blue-800',   header: 'border-l-4 border-blue-400' },
  purple: { badge: 'bg-purple-100 text-purple-800', header: 'border-l-4 border-purple-400' },
  green:  { badge: 'bg-emerald-100 text-emerald-800', header: 'border-l-4 border-green-400' },
  indigo: { badge: 'bg-indigo-100 text-indigo-800', header: 'border-l-4 border-indigo-400' },
  amber:  { badge: 'bg-amber-100 text-amber-800', header: 'border-l-4 border-amber-400' },
  red:    { badge: 'bg-red-100 text-red-800', header: 'border-l-4 border-red-400' },
  teal:   { badge: 'bg-teal-100 text-teal-800', header: 'border-l-4 border-teal-400' },
};

function getStorageKey() { return 'tml_uat_results_v1'; }
function loadResults() {
  try { return JSON.parse(localStorage.getItem(getStorageKey()) || '{}'); } catch { return {}; }
}
function saveResults(r) {
  try { localStorage.setItem(getStorageKey(), JSON.stringify(r)); } catch {}
}

export default function AdminUAT() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({});
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const init = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { navigate(createPageUrl('AdminLogin')); return; }
        const userData = await base44.auth.me();
        if (userData.role !== 'admin') { navigate(createPageUrl('LawyerDashboard')); return; }
        setUser(userData);
        const saved = loadResults();
        setResults(saved.results || {});
        setNotes(saved.notes || {});
      } catch { navigate(createPageUrl('AdminLogin')); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  const updateResult = (testId, status) => {
    const r = { ...results, [testId]: status };
    const n = notes;
    setResults(r);
    saveResults({ results: r, notes: n });
  };

  const updateNote = (testId, note) => {
    const n = { ...notes, [testId]: note };
    setNotes(n);
    saveResults({ results, notes: n });
  };

  const resetAll = () => {
    setResults({});
    setNotes({});
    saveResults({ results: {}, notes: {} });
  };

  const toggleExpand = (testId) => {
    setExpanded(prev => ({ ...prev, [testId]: !prev[testId] }));
  };

  // Stats
  const allTests = UAT_TESTS.flatMap(s => s.tests);
  const total = allTests.length;
  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = allTests.filter(t => (results[t.id] || 'untested') === s).length;
    return acc;
  }, {});
  const blockingFailed = allTests.filter(t => t.blocking && (results[t.id] === 'fail' || results[t.id] === 'blocked'));
  const progressPct = total > 0 ? Math.round(((counts.pass + counts.fail + counts.blocked + counts.skip) / total) * 100) : 0;

  const filteredSections = UAT_TESTS.map(section => ({
    ...section,
    tests: section.tests.filter(t => {
      if (filter === 'all') return true;
      return (results[t.id] || 'untested') === filter;
    }),
  })).filter(s => s.tests.length > 0);

  const exportCSV = () => {
    const rows = [['Test ID', 'Section', 'Role', 'Scenario', 'Expected Result', 'Status', 'Notes', 'Blocking']];
    UAT_TESTS.forEach(section => {
      section.tests.forEach(t => {
        rows.push([
          t.id, section.section, t.role, t.scenario, t.expected,
          results[t.id] || 'untested', notes[t.id] || '', t.blocking ? 'YES' : 'no'
        ]);
      });
    });
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tml-uat-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar user={user} />
      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Staging UAT Checklist</h1>
              <p className="text-gray-500 mt-1">End-to-end validation of all critical platform flows — Taylor Made Law v1</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">Staging / Dev Database</span>
                <span className="text-xs text-gray-400">Results saved in browser localStorage</span>
              </div>
            </div>
            <div className="flex gap-3">
              <TMLButton variant="outline" size="sm" onClick={resetAll}>
                <RotateCcw className="w-4 h-4 mr-1" /> Reset All
              </TMLButton>
              <TMLButton variant="primary" size="sm" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </TMLButton>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            {[
              { label: 'Total', value: total, bg: 'bg-gray-50', text: 'text-gray-700' },
              { label: 'Pass', value: counts.pass, bg: 'bg-emerald-50', text: 'text-emerald-700' },
              { label: 'Fail', value: counts.fail, bg: 'bg-red-50', text: 'text-red-700' },
              { label: 'Blocked', value: counts.blocked, bg: 'bg-amber-50', text: 'text-amber-700' },
              { label: 'Skip', value: counts.skip, bg: 'bg-gray-50', text: 'text-gray-400' },
              { label: 'Untested', value: counts.untested, bg: 'bg-blue-50', text: 'text-blue-700' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.bg} rounded-xl p-4 text-center`}>
                <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Test Progress</span>
              <span className="text-sm text-gray-500">{progressPct}% executed</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(counts.pass / total) * 100}%` }} />
              <div className="h-full bg-red-400 transition-all" style={{ width: `${(counts.fail / total) * 100}%` }} />
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${(counts.blocked / total) * 100}%` }} />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Pass</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Fail</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Blocked</span>
            </div>
          </div>

          {/* Blocking Failures Alert */}
          {blockingFailed.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border-2 border-red-300 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-red-800 mb-1">{blockingFailed.length} Blocking Failure{blockingFailed.length > 1 ? 's' : ''} — Must Fix Before Launch</p>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {blockingFailed.map(t => (
                      <li key={t.id}><strong>{t.id}</strong> — {t.scenario}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['all', ...STATUS_OPTIONS].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                  filter === f ? 'bg-[#3a164d] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-3 h-3 inline mr-1" />
                {f === 'all' ? `All (${total})` : `${f} (${counts[f] || 0})`}
              </button>
            ))}
          </div>

          {/* Test Sections */}
          <div className="space-y-8">
            {filteredSections.map(section => {
              const sectionColors = SECTION_COLORS[section.color] || SECTION_COLORS.blue;
              const sectionPassed = section.tests.filter(t => results[t.id] === 'pass').length;
              return (
                <div key={section.section}>
                  <div className={`flex items-center justify-between mb-4 pl-4 ${sectionColors.header}`}>
                    <h2 className="text-lg font-bold text-gray-900">{section.section}</h2>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sectionColors.badge}`}>
                      {sectionPassed}/{section.tests.length} passed
                    </span>
                  </div>

                  <div className="space-y-3">
                    {section.tests.map(test => {
                      const status = results[test.id] || 'untested';
                      const style = STATUS_STYLES[status];
                      const Icon = style.icon;
                      const isExpanded = expanded[test.id];

                      return (
                        <TMLCard key={test.id} className={`transition-all ${status === 'fail' || status === 'blocked' ? 'ring-2 ring-red-200' : ''}`}>
                          <TMLCardContent className="p-4">
                            {/* Row Header */}
                            <div className="flex items-start gap-4">
                              {/* Test ID */}
                              <div className="shrink-0 pt-0.5">
                                <span className="font-mono text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">{test.id}</span>
                              </div>

                              {/* Test Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 flex-wrap">
                                  <p className="font-semibold text-gray-900 text-sm">{test.scenario}</p>
                                  {test.blocking && (
                                    <span className="shrink-0 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Blocking</span>
                                  )}
                                  <span className="shrink-0 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{test.role}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{test.expected}</p>
                              </div>

                              {/* Status + Controls */}
                              <div className="flex items-center gap-2 shrink-0">
                                {test.link && (
                                  <a href={test.link} target="_blank" rel="noopener noreferrer"
                                    className="p-1.5 rounded text-gray-400 hover:text-[#3a164d] hover:bg-gray-100 transition-colors"
                                    title="Open test page">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                                <select
                                  value={status}
                                  onChange={e => updateResult(test.id, e.target.value)}
                                  className={`text-xs font-semibold px-2 py-1.5 rounded-lg border-0 cursor-pointer ${style.bg} ${style.text}`}
                                >
                                  {STATUS_OPTIONS.map(s => (
                                    <option key={s} value={s} className="bg-white text-gray-700 capitalize">{STATUS_STYLES[s].label}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => toggleExpand(test.id)}
                                  className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            {/* Expanded Detail */}
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-4 pt-4 border-t border-gray-100 grid md:grid-cols-2 gap-6"
                              >
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Test Steps</p>
                                  <ol className="space-y-1.5">
                                    {test.steps.map((step, i) => (
                                      <li key={i} className="flex gap-2 text-sm text-gray-700">
                                        <span className="shrink-0 w-5 h-5 rounded-full bg-[#3a164d]/10 text-[#3a164d] text-xs flex items-center justify-center font-semibold">{i + 1}</span>
                                        {step}
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Expected Result</p>
                                  <p className="text-sm text-gray-700 bg-emerald-50 rounded-lg p-3">{test.expected}</p>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-4">Notes / Actual Result</p>
                                  <textarea
                                    value={notes[test.id] || ''}
                                    onChange={e => updateNote(test.id, e.target.value)}
                                    placeholder="Record actual result, defect details, or notes..."
                                    rows={3}
                                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d] resize-none"
                                  />
                                </div>
                              </motion.div>
                            )}
                          </TMLCardContent>
                        </TMLCard>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Phase 8 Audit Logging Reference */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-8 border border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Phase 8: Audit Logging Reference
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Core Events Logged</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2"><span className="text-blue-600 font-bold">✓</span> <span><strong>user_upserted</strong> — User identity created/merged</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600 font-bold">✓</span> <span><strong>activation_token_created</strong> — Token generated for account setup</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600 font-bold">✓</span> <span><strong>activation_completed</strong> — Password set, account activated</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600 font-bold">✓</span> <span><strong>application_submitted</strong> — Lawyer app submitted via /JoinNetwork</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600 font-bold">✓</span> <span><strong>admin_alert_sent</strong> — Admin notified of new app/lead</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600 font-bold">✓</span> <span><strong>application_approved</strong> — Admin approves lawyer</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600 font-bold">✓</span> <span><strong>lawyer_disabled</strong> — Account access revoked</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600 font-bold">✓</span> <span><strong>lawyer_reinstated</strong> — Disabled account restored</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600 font-bold">✓</span> <span><strong>lead_created</strong> — New lead submission from /FindLawyer</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600 font-bold">✓</span> <span><strong>lead_sent_to_lead_docket</strong> — Lead successfully synced to external CRM</span></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Locations</h3>
                <ul className="space-y-2 text-xs text-gray-600 font-mono">
                  <li className="bg-white rounded p-2">functions/submitFindLawyerLead.js (lead_created, lead_sent_to_lead_docket)</li>
                  <li className="bg-white rounded p-2">functions/approveLawyerApplication.js (application_approved, activation_token_created, admin_alert_sent)</li>
                  <li className="bg-white rounded p-2">functions/completeOnboarding.js (activation_completed)</li>
                  <li className="bg-white rounded p-2">functions/disableLawyer.js (lawyer_disabled)</li>
                  <li className="bg-white rounded p-2">functions/reinstateLawyer.js (lawyer_reinstated)</li>
                  <li className="bg-white rounded p-2">functions/upsertUserByEmail.js (user_upserted)</li>
                  <li className="bg-white rounded p-2">functions/submitLawyerApplication.js (application_submitted, admin_alert_sent)</li>
                  <li className="bg-white rounded p-2">Entity: AuditLog (view in Admin Dashboard)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Summary Report */}
          <div className="mt-8 bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#3a164d]" />
              UAT Summary Report
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Results Snapshot</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Total Test Cases</span>
                    <span className="font-semibold">{total}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-emerald-600 font-medium">✓ Pass</span>
                    <span className="font-semibold text-emerald-700">{counts.pass}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-red-600 font-medium">✗ Fail</span>
                    <span className="font-semibold text-red-700">{counts.fail}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-amber-600 font-medium">⚠ Blocked</span>
                    <span className="font-semibold text-amber-700">{counts.blocked}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Untested</span>
                    <span className="font-semibold">{counts.untested}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-500">Execution Rate</span>
                    <span className="font-semibold">{progressPct}%</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Blocking Failures</h3>
                {blockingFailed.length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-xl p-4">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">No blocking failures — platform is launch-ready (from tested flows)</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockingFailed.map(t => (
                      <div key={t.id} className="flex items-start gap-2 bg-red-50 rounded-lg p-3">
                        <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-red-800">{t.id} — {t.scenario}</p>
                          {notes[t.id] && <p className="text-xs text-red-600 mt-1">{notes[t.id]}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <h3 className="font-semibold text-gray-700 mb-3 mt-6">Seeded Test Data (Dev DB)</h3>
                <div className="space-y-1.5 text-sm">
                  {[
                    { label: '3 Published Cases', note: 'Auto Accident, Workers Comp, Medical Malpractice' },
                    { label: '2 Resources', note: 'Referral Agreement + Onboarding Guide' },
                    { label: '1 Sample Lead', note: 'uat-lead@test.com, status=new, sync=pending' },
                    { label: '3 LawyerApplications', note: 'pending, approved, invited states' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#3a164d] mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-gray-700">{item.label}</span>
                        <span className="text-gray-400 text-xs ml-2">{item.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}