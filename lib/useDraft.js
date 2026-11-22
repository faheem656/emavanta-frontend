'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { del, get, post } from './api';

const LOCAL_KEY = 'emavanta_campaign_draft_v1';
/** Anything older than this is not worth restoring — it would surprise the user. */
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

const readLocal = () => {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt) return null;
    return parsed;
  } catch { return null; }
};

const writeLocal = (payload) => {
  try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(payload)); return true; }
  catch { return false; }
};

export const clearDraft = () => {
  try { window.localStorage.removeItem(LOCAL_KEY); } catch { /* ignore */ }
  del('/campaigns/drafts').catch(() => {});
};

/**
 * Keeps the campaign wizard on disk while it is being built.
 *
 * Two copies, on purpose:
 *  - `localStorage` on every keystroke (survives a reload, a crash or the lights going out)
 *  - the server every couple of seconds (survives a different browser, a cleared cache or
 *    moving to another computer)
 *
 * On open it restores whichever copy is newer and tells the user it did, so nothing is
 * ever silently replaced or silently lost.
 */
export default function useDraft({ state, enabled = true, onRestore }) {
  const [status, setStatus] = useState('idle'); // idle | saving | saved | local | error
  const [savedAt, setSavedAt] = useState(null);
  const [restored, setRestored] = useState(null);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  const timer = useRef(null);
  const retry = useRef(null);
  const lastSent = useRef(0);
  const dirty = useRef(false);

  stateRef.current = state;

  // ---- restore -------------------------------------------------------
  useEffect(() => {
    let alive = true;
    const local = readLocal();
    const localFresh = local && Date.now() - Date.parse(local.savedAt) < MAX_AGE_MS ? local : null;

    get('/campaigns/drafts/current')
      .then(r => {
        if (!alive) return;
        const server = r?.draft
          ? { state: r.draft.state, savedAt: r.draft.updatedAt }
          : null;
        const newest = [server, localFresh]
          .filter(Boolean)
          .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))[0] || null;
        if (newest?.state) {
          onRestore?.(newest.state, newest.savedAt);
          setSavedAt(newest.savedAt);
          setRestored(newest.savedAt);
          setStatus('saved');
        }
      })
      .catch(() => {
        // No API right now: the local copy is still enough to keep working.
        if (!alive) return;
        if (localFresh?.state) {
          onRestore?.(localFresh.state, localFresh.savedAt);
          setSavedAt(localFresh.savedAt);
          setRestored(localFresh.savedAt);
          setStatus('local');
        }
      })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  // ---- autosave ------------------------------------------------------
  const flush = useCallback(async (force = false) => {
    if (!enabled || !dirty.current) return;
    const payload = { savedAt: new Date().toISOString(), state: stateRef.current };
    // the local copy is written first and always — it is the one that survives a crash
    writeLocal(payload);
    dirty.current = false;
    setSavedAt(payload.savedAt);

    const now = Date.now();
    if (!force && now - lastSent.current < 2500) {
      // Throttled: the device copy is current, and a follow-up save is queued so the
      // server copy never lags behind the last keystroke.
      setStatus('saved');
      if (!retry.current) {
        retry.current = setTimeout(() => { retry.current = null; dirty.current = true; flush(true); },
          2500 - (now - lastSent.current));
      }
      return;
    }
    lastSent.current = now;
    setStatus('saving');
    try {
      const r = await post('/campaigns/drafts', { state: stateRef.current });
      setSavedAt(r?.savedAt || payload.savedAt);
      setStatus('saved');
    } catch {
      // kept on this device; the next change retries
      setStatus('local');
    }
  }, [enabled]);

  useEffect(() => {
    if (!ready || !enabled) return;
    dirty.current = true;
    setStatus(s => (s === 'saving' ? s : 'saving'));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(), 900);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [state, ready, enabled]);

  // a last synchronous-ish save when the tab is closed or hidden
  useEffect(() => {
    const onHide = () => {
      if (!enabled) return;
      writeLocal({ savedAt: new Date().toISOString(), state: stateRef.current });
      flush(true);
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') onHide(); };
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
      if (retry.current) { clearTimeout(retry.current); retry.current = null; }
    };
  }, [flush, enabled]);

  const discard = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    if (retry.current) clearTimeout(retry.current);
    dirty.current = false;
    setStatus('idle'); setSavedAt(null); setRestored(null);
    clearDraft();
  }, []);

  return { status, savedAt, restored, ready, discard, saveNow: () => flush(true) };
}

/** "3 minutes ago" — for the restored-draft banner. */
export const agoText = iso => {
  if (!iso) return '';
  const secs = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (secs < 45) return 'just now';
  if (secs < 3600) return `${Math.round(secs / 60)} minute${Math.round(secs / 60) === 1 ? '' : 's'} ago`;
  if (secs < 86400) return `${Math.round(secs / 3600)} hour${Math.round(secs / 3600) === 1 ? '' : 's'} ago`;
  return `${Math.round(secs / 86400)} day${Math.round(secs / 86400) === 1 ? '' : 's'} ago`;
};
