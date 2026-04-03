/**
 * base44MockClient.js — Mock Base44 SDK for local development
 *
 * Activated when VITE_USE_MOCKS=true. Provides stub implementations of:
 *   - base44.entities.{EntityName}.filter/list/create/update/delete/subscribe
 *   - base44.functions.invoke(name, payload)
 *   - base44.auth.me/isAuthenticated/login/logout/etc.
 *   - base44.integrations.Core.SendEmail/UploadFile
 *   - base44.appLogs.logUserInApp
 *   - base44.users.inviteUser
 *
 * All calls log to console with [MOCK] prefix for debugging.
 * Entity operations return empty arrays / stub objects.
 * Auth returns a mock admin+lawyer user so both portals render.
 */

// ---------------------------------------------------------------------------
// Mock User — admin role + approved lawyer so both portals are accessible
// ---------------------------------------------------------------------------
const MOCK_USER = {
  id: 'mock-user-1',
  email: 'dev@taylormadelaw.com',
  full_name: 'Dev Lawyer',
  role: 'admin',
  user_type: 'admin',
  user_status: 'approved',
  membership_status: 'paid',
  email_verified: true,
  password_set: true,
  stripe_customer_id: 'cus_mock_123',
  created_date: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Mock LawyerProfile — returned when LawyerProfile is queried
// ---------------------------------------------------------------------------
const MOCK_LAWYER_PROFILE = {
  id: 'mock-profile-1',
  user_id: 'mock-user-1',
  full_name: 'Dev Lawyer',
  email: 'dev@taylormadelaw.com',
  firm_name: 'Mock & Associates LLP',
  bar_number: 'TX12345678',
  states_licensed: ['Texas', 'California'],
  practice_areas: ['Personal Injury', 'Mass Tort', 'Medical Malpractice'],
  status: 'approved',
  subscription_status: 'active',
  stripe_customer_id: 'cus_mock_123',
  stripe_subscription_id: 'sub_mock_123',
  bio: 'Mock attorney profile for local development.',
  years_of_experience: 10,
  referral_agreement_accepted: true,
  referral_agreement_version: '1.0',
  profile_completed: true,
  created_date: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Seed data — provides realistic stub data for common entity queries
// ---------------------------------------------------------------------------
const SEED_DATA = {
  LawyerProfile: [MOCK_LAWYER_PROFILE],
  User: [MOCK_USER],
};

// ---------------------------------------------------------------------------
// Helper: console logger with [MOCK] prefix
// ---------------------------------------------------------------------------
const log = (method, ...args) => {
  console.log(`%c[MOCK] ${method}`, 'color: #a47864; font-weight: bold', ...args);
};

// ---------------------------------------------------------------------------
// Entity Proxy — handles any entity name dynamically
// ---------------------------------------------------------------------------
let idCounter = 100;

const createEntityProxy = (entityName) => ({
  filter: async (query) => {
    log(`${entityName}.filter`, query);
    return SEED_DATA[entityName] || [];
  },
  list: async (...args) => {
    log(`${entityName}.list`, ...args);
    return SEED_DATA[entityName] || [];
  },
  create: async (data) => {
    const record = { id: `mock-${++idCounter}`, ...data, created_date: new Date().toISOString() };
    log(`${entityName}.create`, record);
    return record;
  },
  update: async (id, data) => {
    log(`${entityName}.update`, id, data);
    return { id, ...data };
  },
  delete: async (id) => {
    log(`${entityName}.delete`, id);
    return { success: true };
  },
  read: async (id) => {
    log(`${entityName}.read`, id);
    const seed = SEED_DATA[entityName];
    return seed?.[0] || { id, created_date: new Date().toISOString() };
  },
  subscribe: (callback) => {
    log(`${entityName}.subscribe`, '(no-op)');
    // Return unsubscribe function
    return () => {
      log(`${entityName}.unsubscribe`);
    };
  },
});

const entitiesProxy = new Proxy({}, {
  get: (_target, entityName) => {
    return createEntityProxy(entityName);
  },
});

// ---------------------------------------------------------------------------
// Service-role entities (same as regular but logs the escalation)
// ---------------------------------------------------------------------------
const serviceRoleEntitiesProxy = new Proxy({}, {
  get: (_target, entityName) => {
    const entity = createEntityProxy(entityName);
    // Wrap each method to note service role
    return new Proxy(entity, {
      get: (target, method) => {
        if (typeof target[method] === 'function') {
          return (...args) => {
            log(`[SERVICE ROLE] ${entityName}.${method}`, ...args);
            return target[method](...args);
          };
        }
        return target[method];
      },
    });
  },
});

// ---------------------------------------------------------------------------
// Functions mock
// ---------------------------------------------------------------------------
const functions = {
  invoke: async (functionName, payload) => {
    log(`functions.invoke("${functionName}")`, payload);

    // The real Base44 SDK wraps all function responses in { data: ... }.
    // Frontend code accesses res.data, so we must match that contract.
    let result;
    switch (functionName) {
      case 'getCasesForLawyer':
        result = []; break;
      case 'getDirectInbox':
        result = { threads: [], total_unread: 0 }; break;
      case 'getDirectThread':
        result = { messages: [], participants: [], thread: {} }; break;
      case 'searchNetworkAttorneys':
        result = { results: [] }; break;
      case 'acceptCase':
        result = { success: true }; break;
      case 'submitCase':
        result = { success: true, id: `mock-case-${++idCounter}` }; break;
      case 'sendDirectMessage':
        result = { success: true, message: { id: `mock-msg-${++idCounter}` } }; break;
      case 'startDirectThread':
        result = { success: true, thread_id: `mock-thread-${++idCounter}` }; break;
      case 'createSubscriptionCheckout':
        result = { url: '#mock-checkout' }; break;
      case 'createSetupIntent':
        result = { clientSecret: 'mock_secret', publishableKey: 'pk_test_mock' }; break;
      case 'activateAccount':
        result = { success: true }; break;
      case 'generateLegacyReport':
        result = { data: [], count: 0 }; break;
      default:
        result = { success: true }; break;
    }
    return { data: result };
  },
};

// ---------------------------------------------------------------------------
// Auth mock
// ---------------------------------------------------------------------------
const auth = {
  me: async () => {
    log('auth.me()');
    return MOCK_USER;
  },
  isAuthenticated: () => {
    log('auth.isAuthenticated()');
    return true;
  },
  login: async ({ email, password } = {}) => {
    log('auth.login()', { email });
    return { token: 'mock-token-abc123' };
  },
  loginViaEmailPassword: async (email, password) => {
    log('auth.loginViaEmailPassword()', { email });
    return { token: 'mock-token-abc123' };
  },
  logout: (redirectUrl) => {
    log('auth.logout()', redirectUrl);
  },
  redirectToLogin: (returnUrl) => {
    log('auth.redirectToLogin()', returnUrl);
  },
  verifyOtp: async ({ email, otpCode } = {}) => {
    log('auth.verifyOtp()', { email, otpCode });
    return { success: true, token: 'mock-token-abc123' };
  },
  resendOtp: async (email) => {
    log('auth.resendOtp()', email);
    return { success: true };
  },
  resetPassword: async ({ resetToken, newPassword } = {}) => {
    log('auth.resetPassword()');
    return { success: true };
  },
  updateMe: async (updates) => {
    log('auth.updateMe()', updates);
    return { ...MOCK_USER, ...updates };
  },
  register: async (data) => {
    log('auth.register()', data);
    return { success: true, token: 'mock-token-abc123' };
  },
};

// ---------------------------------------------------------------------------
// Integrations mock (Core.SendEmail, Core.UploadFile)
// ---------------------------------------------------------------------------
const integrations = {
  Core: {
    SendEmail: async (params) => {
      log('integrations.Core.SendEmail()', params);
      return { success: true };
    },
    UploadFile: async ({ file } = {}) => {
      const fileName = file?.name || 'mock-file.png';
      log('integrations.Core.UploadFile()', fileName);
      return { file_url: `https://mock-storage.local/${fileName}` };
    },
  },
};

// ---------------------------------------------------------------------------
// App logs mock
// ---------------------------------------------------------------------------
const appLogs = {
  logUserInApp: async (pageName) => {
    // Silent — too noisy to log every page navigation
    // Must return a Promise since callers use .catch()
  },
};

// ---------------------------------------------------------------------------
// Users mock (for base44.users.inviteUser)
// ---------------------------------------------------------------------------
const users = {
  inviteUser: async (email, role) => {
    log('users.inviteUser()', { email, role });
    return { success: true };
  },
};

// ---------------------------------------------------------------------------
// Assembled mock client
// ---------------------------------------------------------------------------
export const base44 = {
  entities: entitiesProxy,
  asServiceRole: {
    entities: serviceRoleEntitiesProxy,
    functions,
    integrations,
  },
  functions,
  auth,
  integrations,
  appLogs,
  users,
};

// Also export the mock user for use in AuthContext
export const MOCK_USER_DATA = MOCK_USER;
export const MOCK_PUBLIC_SETTINGS = {
  id: 'mock-app',
  public_settings: {
    app_name: 'Taylor Made Law (Local Dev)',
    requires_auth: false,
  },
};
