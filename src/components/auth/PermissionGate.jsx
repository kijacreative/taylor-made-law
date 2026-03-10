import React from 'react';
import { AlertCircle } from 'lucide-react';
import { getPermissions } from './permissions';

/**
 * Gate component to restrict access based on user status
 * Shows fallback UI if user lacks permission
 */
export default function PermissionGate({
  userStatus,
  action,
  children,
  fallback = null,
  showMessage = true,
}) {
  const perms = getPermissions(userStatus);
  const hasAccess = perms[action] === true;

  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }

    if (showMessage) {
      return (
        <div className="flex items-center justify-center py-12 px-4">
          <div className="max-w-md text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Feature Unavailable</h3>
            <p className="text-sm text-gray-600">
              Your account is pending approval. This feature will be available once your account is approved.
            </p>
          </div>
        </div>
      );
    }

    return null;
  }

  return children;
}