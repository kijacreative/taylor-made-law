/**
 * DEPRECATED: Join
 * Redirects to canonical /join-the-network route
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Join() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = window.location.search;
    navigate(`/join-the-network${params}`, { replace: true });
  }, [navigate]);

  return null;
}