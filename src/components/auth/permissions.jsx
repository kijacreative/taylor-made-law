/**
 * Permission model for Taylor Made Law
 * Controls access based on user status (pending, approved, disabled)
 */

const PERMISSIONS = {
  pending: {
    // Pending lawyers have limited access
    canAccessDashboard: true,
    canAccessProfile: true,
    canAccessResources: true,
    canViewMarketplaceTeaser: true, // View counts only
    canViewCaseDetails: false,
    canAcceptCases: false,
    canPostCases: false,
    canCreateCircles: false,
    canAccessCircles: false,
    canAccessCommunity: false,
  },
  approved: {
    // Approved lawyers have full access
    canAccessDashboard: true,
    canAccessProfile: true,
    canAccessResources: true,
    canViewMarketplaceTeaser: true,
    canViewCaseDetails: true,
    canAcceptCases: true,
    canPostCases: true,
    canCreateCircles: true,
    canAccessCircles: true,
    canAccessCommunity: true,
  },
  disabled: {
    // Disabled lawyers are blocked (login prevents access)
    canAccessDashboard: false,
    canAccessProfile: false,
    canAccessResources: false,
    canViewMarketplaceTeaser: false,
    canViewCaseDetails: false,
    canAcceptCases: false,
    canPostCases: false,
    canCreateCircles: false,
    canAccessCircles: false,
    canAccessCommunity: false,
  },
};

/**
 * Get permissions for a user status
 */
export const getPermissions = (userStatus) => {
  return PERMISSIONS[userStatus] || PERMISSIONS.pending;
};

/**
 * Check if user can perform an action
 */
export const canPerformAction = (userStatus, action) => {
  const perms = getPermissions(userStatus);
  return perms[action] === true;
};

/**
 * Get permission-restricted message
 */
export const getRestrictionMessage = (action) => {
  const messages = {
    canViewCaseDetails: 'Your account is pending approval. You cannot view case details yet.',
    canAcceptCases: 'Your account is pending approval. You cannot accept cases yet.',
    canPostCases: 'Your account is pending approval. You cannot post cases yet.',
    canCreateCircles: 'Your account is pending approval. You cannot create circles yet.',
    canAccessCircles: 'Your account is pending approval. You cannot access circles yet.',
    canAccessCommunity: 'Your account is pending approval. You cannot access the community yet.',
  };
  return messages[action] || 'You do not have permission to access this feature.';
};