/**
 * Notifications service — CircleNotification, Popup, PopupImpression.
 */
import { base44 } from '@/api/base44Client';

// ---------------------------------------------------------------------------
// CircleNotification
// ---------------------------------------------------------------------------

export function subscribeCircleNotifications(callback) {
  return base44.entities.CircleNotification.subscribe(callback);
}

export function filterNotifications(query, sort) {
  return base44.entities.CircleNotification.filter(query, sort);
}

export function updateNotification(id, data) {
  return base44.entities.CircleNotification.update(id, data);
}

// ---------------------------------------------------------------------------
// Popup
// ---------------------------------------------------------------------------

export function listPopups(sort = '-created_date') {
  return base44.entities.Popup.list(sort);
}

export function filterPopups(query) {
  return base44.entities.Popup.filter(query);
}

export function createPopup(data) {
  return base44.entities.Popup.create(data);
}

export function updatePopup(id, data) {
  return base44.entities.Popup.update(id, data);
}

export function deletePopup(id) {
  return base44.entities.Popup.delete(id);
}

// ---------------------------------------------------------------------------
// PopupImpression
// ---------------------------------------------------------------------------

export function listImpressions(sort = '-created_date') {
  return base44.entities.PopupImpression.list(sort);
}

export function filterImpressions(query) {
  return base44.entities.PopupImpression.filter(query);
}

export function createImpression(data) {
  return base44.entities.PopupImpression.create(data);
}

export function updateImpression(id, data) {
  return base44.entities.PopupImpression.update(id, data);
}
