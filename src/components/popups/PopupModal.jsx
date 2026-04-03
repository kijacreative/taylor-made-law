import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { filterPopups, filterImpressions, createImpression, updateImpression } from '@/services/notifications';

const SIZE_WIDTHS = {
  small: 'max-w-sm',
  medium: 'max-w-lg',
  large: 'max-w-2xl',
};

// Stable session ID for this browser session
const SESSION_ID = Math.random().toString(36).slice(2);

function shouldShowPopup(popup, impression, lawyerProfileStatus) {
  if (popup.status !== 'active') return false;

  const now = new Date();
  if (popup.start_at && new Date(popup.start_at) > now) return false;
  if (popup.end_at && new Date(popup.end_at) < now) return false;

  // Audience check
  if (popup.audience === 'pending' && lawyerProfileStatus !== 'pending') return false;
  if (popup.audience === 'approved' && lawyerProfileStatus !== 'approved') return false;

  // Frequency check
  if (!impression) return true; // never shown

  const freq = popup.frequency;
  if (freq === 'once_ever') return false; // already shown

  if (freq === 'once_per_session') {
    return impression.session_id !== SESSION_ID;
  }

  if (freq === 'once_per_day') {
    const shownAt = new Date(impression.shown_at);
    const hoursDiff = (now - shownAt) / 1000 / 3600;
    return hoursDiff >= 24;
  }

  if (freq === 'every_visit') return true;

  return false;
}

export default function PopupModal({ user, lawyerProfile, placement = 'dashboard' }) {
  const [popup, setPopup] = useState(null);
  const [visible, setVisible] = useState(false);
  const [impressionId, setImpressionId] = useState(null);
  const timerRef = useRef(null);

  const lawyerStatus = lawyerProfile?.status || 'pending';

  useEffect(() => {
    if (!user) return;
    loadPopup();
  }, [user]);

  const loadPopup = async () => {
    const placementFilters = [placement, 'all_app'];
    const allPopups = await filterPopups({ status: 'active' });

    // Filter by placement and audience
    const eligible = allPopups.filter(p =>
      placementFilters.includes(p.placement) &&
      (p.audience === 'all' ||
       (p.audience === 'pending' && lawyerStatus === 'pending') ||
       (p.audience === 'approved' && lawyerStatus === 'approved'))
    );

    if (!eligible.length) return;

    // Find one to show (first eligible after frequency check)
    for (const p of eligible) {
      const impressions = await filterImpressions({
        popup_id: p.id,
        user_id: user.id,
      });
      const impression = impressions[0] || null;

      if (shouldShowPopup(p, impression, lawyerStatus)) {
        setPopup(p);

        // Schedule display
        if (p.trigger_type === 'delay' && p.delay_seconds > 0) {
          timerRef.current = setTimeout(() => triggerShow(p), p.delay_seconds * 1000);
        } else if (p.trigger_type === 'scroll' && p.scroll_percent > 0) {
          setupScrollTrigger(p);
        } else {
          // on_load — small delay for page settle
          timerRef.current = setTimeout(() => triggerShow(p), 600);
        }
        break;
      }
    }
  };

  const setupScrollTrigger = (p) => {
    const handler = () => {
      const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrolled >= (p.scroll_percent || 50)) {
        window.removeEventListener('scroll', handler);
        triggerShow(p);
      }
    };
    window.addEventListener('scroll', handler);
  };

  const triggerShow = async (p) => {
    setVisible(true);
    // Record impression
    const record = await createImpression({
      popup_id: p.id,
      user_id: user.id,
      user_email: user.email,
      shown_at: new Date().toISOString(),
      session_id: SESSION_ID,
    });
    setImpressionId(record.id);
    // Analytics: popup_shown (TODO: migrate analytics)
  };

  const handleClose = async () => {
    setVisible(false);
    if (impressionId) {
      await updateImpression(impressionId, { dismissed_at: new Date().toISOString() });
    }
    // Analytics: popup_dismissed (TODO: migrate analytics)
  };

  const handleClick = async () => {
    if (!popup?.link_url) return;
    if (impressionId) {
      await updateImpression(impressionId, { clicked_at: new Date().toISOString() });
    }
    // Analytics: popup_clicked (TODO: migrate analytics)
    if (popup.link_new_tab) {
      window.open(popup.link_url, '_blank');
    } else {
      window.location.href = popup.link_url;
    }
    setVisible(false);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!popup) return null;

  const sizeClass = SIZE_WIDTHS[popup.size] || SIZE_WIDTHS.medium;

  return (
    <AnimatePresence>
      {visible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={popup.close_on_overlay ? handleClose : undefined}
        >
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className={`relative w-full ${sizeClass} bg-white rounded-3xl shadow-2xl overflow-hidden z-10`}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 z-20 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow-md flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Image */}
            {popup.image_url && (
              <div
                className={`w-full ${popup.image_clickable && popup.link_url ? 'cursor-pointer' : ''}`}
                onClick={popup.image_clickable && popup.link_url ? handleClick : undefined}
              >
                <img
                  src={popup.image_url}
                  alt={popup.image_alt || popup.headline || 'Promotion'}
                  className="w-full object-cover"
                  style={{ maxHeight: popup.size === 'small' ? '180px' : popup.size === 'large' ? '380px' : '260px' }}
                />
              </div>
            )}

            {/* Content */}
            {(popup.headline || popup.body_text || popup.link_url) && (
              <div className="p-6">
                {popup.headline && (
                  <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{popup.headline}</h2>
                )}
                {popup.body_text && (
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{popup.body_text}</p>
                )}
                {popup.link_url && popup.button_label && (
                  <button
                    onClick={handleClick}
                    className="inline-flex items-center gap-2 bg-[#3a164d] hover:bg-[#2a1038] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors shadow-md"
                  >
                    {popup.button_label}
                    {popup.link_new_tab && <ExternalLink className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}