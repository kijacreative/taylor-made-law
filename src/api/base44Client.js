import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
// Static import — Vite dead-code-eliminates the mock module in production builds
// because the USE_MOCKS branch is statically false when VITE_USE_MOCKS is unset.
import { base44 as mockClient } from './base44MockClient.js';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// ---------------------------------------------------------------------------
// Mock mode: when VITE_USE_MOCKS=true, use local stubs instead of Base44 API
// ---------------------------------------------------------------------------
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

let base44Instance;

if (USE_MOCKS) {
  base44Instance = mockClient;
  console.log(
    '%c[MOCK MODE] Using mock Base44 client. Set VITE_USE_MOCKS=false to connect to real backend.',
    'color: #a47864; font-weight: bold; font-size: 14px'
  );
} else {
  // Production: create real Base44 SDK client
  base44Instance = createClient({
    appId,
    token,
    functionsVersion,
    serverUrl: '',
    requiresAuth: false,
    appBaseUrl
  });
}

export const base44 = base44Instance;
