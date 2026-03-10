/**
 * DEPRECATED: ForLawyers
 * ============================================================
 * This page has been retired. All attorney onboarding now
 * flows through pages/JoinNetwork (the canonical signup flow).
 *
 * This component exists solely to redirect legacy URLs so that
 * any bookmarks, old email links, or external links still work.
 * URL search params are preserved on redirect (e.g., ?email=...).
 * ============================================================
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ForLawyers() {
  const navigate = useNavigate();

  useEffect(() => {
    // Preserve any URL params (invite tokens, pre-fill) when redirecting
    const params = window.location.search;
    navigate(`/join-the-network${params}`, { replace: true });
  }, [navigate]);

  return null;
}