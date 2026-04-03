/**
 * Services barrel file — re-exports all domain services.
 *
 * Usage:
 *   import { getCurrentUser, getProfile } from '@/services/auth';
 *   import { listPublishedPosts } from '@/services/content';
 *
 * Or import the namespace:
 *   import * as authService from '@/services/auth';
 */

export * as auth from './auth';
export * as lawyers from './lawyers';
export * as cases from './cases';
export * as circles from './circles';
export * as messaging from './messaging';
export * as content from './content';
export * as notifications from './notifications';
export * as admin from './admin';
export * as storage from './storage';
export * as onboarding from './onboarding';
