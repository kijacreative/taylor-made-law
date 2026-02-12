// Taylor Made Law Design System
// Extracted from taylormadelaw.com brand guidelines

export const colors = {
  // Primary brand colors
  primary: {
    DEFAULT: '#3a164d',
    dark: '#2a1038',
    light: '#5a2a6d',
    gradient: 'linear-gradient(135deg, #3a164d 0%, #993333 100%)'
  },
  
  // Accent colors
  accent: {
    DEFAULT: '#a47864',
    light: '#c49b8a',
    dark: '#7d5a4a',
    copper: '#a47864'
  },
  
  // Background colors
  background: {
    DEFAULT: '#faf8f5',
    cream: '#f8f8f8',
    white: '#ffffff',
    dark: '#1a1a1a'
  },
  
  // Text colors
  text: {
    DEFAULT: '#333333',
    light: '#666666',
    muted: '#999999',
    white: '#ffffff'
  },
  
  // Semantic colors
  success: {
    DEFAULT: '#22c55e',
    light: '#dcfce7',
    dark: '#15803d'
  },
  warning: {
    DEFAULT: '#f59e0b',
    light: '#fef3c7',
    dark: '#b45309'
  },
  danger: {
    DEFAULT: '#ef4444',
    light: '#fee2e2',
    dark: '#b91c1c'
  },
  
  // UI colors
  border: {
    DEFAULT: '#e5e5e5',
    light: '#f0f0f0',
    dark: '#d4d4d4'
  }
};

export const typography = {
  fonts: {
    heading: '"Inter", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif'
  },
  sizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem'
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }
};

export const spacing = {
  section: '6rem',
  container: '1280px',
  gutter: '1.5rem'
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
};

export const borderRadius = {
  none: '0',
  sm: '0.25rem',
  DEFAULT: '0.5rem',
  md: '0.625rem',
  lg: '1rem',
  xl: '1.5rem',
  full: '9999px'
};

// Practice areas for the platform
export const PRACTICE_AREAS = [
  'Personal Injury',
  'Medical Malpractice',
  'Auto Accidents',
  'Truck Accidents',
  'Workers Compensation',
  'Product Liability',
  'Mass Torts',
  'Nursing Home Abuse',
  'Wrongful Death',
  'Employment Law',
  'Civil Rights',
  'Class Action',
  'Other'
];

// US States
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming', 'District of Columbia'
];

// Urgency levels
export const URGENCY_LEVELS = [
  { value: 'low', label: 'Low - General inquiry', color: 'text-gray-600' },
  { value: 'medium', label: 'Medium - Need help soon', color: 'text-yellow-600' },
  { value: 'high', label: 'High - Urgent matter', color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgent - Time-sensitive issue', color: 'text-red-600' }
];

// Lead statuses
export const LEAD_STATUSES = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800' },
  junior_review: { label: 'Junior Review', color: 'bg-yellow-100 text-yellow-800' },
  senior_review: { label: 'Senior Review', color: 'bg-purple-100 text-purple-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  published: { label: 'Published', color: 'bg-emerald-100 text-emerald-800' },
  routed_cochran: { label: 'Routed to Cochran', color: 'bg-indigo-100 text-indigo-800' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800' }
};

// Case statuses
export const CASE_STATUSES = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  published: { label: 'Available', color: 'bg-green-100 text-green-800' },
  accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800' },
  withdrawn: { label: 'Withdrawn', color: 'bg-red-100 text-red-800' }
};

// Lawyer statuses
export const LAWYER_STATUSES = {
  pending: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  restricted: { label: 'Restricted', color: 'bg-orange-100 text-orange-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' }
};

export default {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
  PRACTICE_AREAS,
  US_STATES,
  URGENCY_LEVELS,
  LEAD_STATUSES,
  CASE_STATUSES,
  LAWYER_STATUSES
};