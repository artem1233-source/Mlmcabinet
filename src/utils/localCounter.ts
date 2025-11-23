/**
 * Local counter management for offline mode
 * Stores counter in localStorage as fallback when server is unavailable
 */

const USER_COUNTER_KEY = 'mlm_user_counter';
const PARTNER_COUNTER_KEY = 'mlm_partner_counter';

export function getLocalUserCounter(): number {
  try {
    const stored = localStorage.getItem(USER_COUNTER_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch (error) {
    console.warn('Failed to get local user counter:', error);
    return 0;
  }
}

export function getLocalPartnerCounter(): number {
  try {
    const stored = localStorage.getItem(PARTNER_COUNTER_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch (error) {
    console.warn('Failed to get local partner counter:', error);
    return 0;
  }
}

export function incrementLocalUserCounter(): number {
  try {
    const current = getLocalUserCounter();
    const next = current + 1;
    localStorage.setItem(USER_COUNTER_KEY, next.toString());
    console.log('📊 Local user counter incremented:', current, '->', next);
    return next;
  } catch (error) {
    console.warn('Failed to increment local user counter:', error);
    return getLocalUserCounter() + 1;
  }
}

export function incrementLocalPartnerCounter(): number {
  try {
    const current = getLocalPartnerCounter();
    const next = current + 1;
    localStorage.setItem(PARTNER_COUNTER_KEY, next.toString());
    console.log('📊 Local partner counter incremented:', current, '->', next);
    return next;
  } catch (error) {
    console.warn('Failed to increment local partner counter:', error);
    return getLocalPartnerCounter() + 1;
  }
}

export function getNextLocalUserId(): string {
  const next = getLocalUserCounter() + 1;
  return next.toString();
}

export function getNextLocalPartnerId(): string {
  const next = getLocalPartnerCounter() + 1;
  return next.toString().padStart(3, '0');
}

export function resetLocalCounters(): void {
  try {
    localStorage.setItem(USER_COUNTER_KEY, '0');
    localStorage.setItem(PARTNER_COUNTER_KEY, '0');
    console.log('✅ Local counters reset to 0');
  } catch (error) {
    console.error('Failed to reset local counters:', error);
  }
}

export function setLocalUserCounter(value: number): void {
  try {
    localStorage.setItem(USER_COUNTER_KEY, value.toString());
    console.log('📊 Local user counter set to:', value);
  } catch (error) {
    console.error('Failed to set local user counter:', error);
  }
}

export function setLocalPartnerCounter(value: number): void {
  try {
    localStorage.setItem(PARTNER_COUNTER_KEY, value.toString());
    console.log('📊 Local partner counter set to:', value);
  } catch (error) {
    console.error('Failed to set local partner counter:', error);
  }
}

/**
 * Sync local counters with server values
 */
export function syncCountersWithServer(userCounter: number, partnerCounter: number): void {
  try {
    const localUser = getLocalUserCounter();
    const localPartner = getLocalPartnerCounter();
    
    // Use the higher value between local and server
    const syncedUser = Math.max(localUser, userCounter);
    const syncedPartner = Math.max(localPartner, partnerCounter);
    
    if (syncedUser !== localUser) {
      setLocalUserCounter(syncedUser);
      console.log('🔄 Synced user counter:', localUser, '->', syncedUser);
    }
    
    if (syncedPartner !== localPartner) {
      setLocalPartnerCounter(syncedPartner);
      console.log('🔄 Synced partner counter:', localPartner, '->', syncedPartner);
    }
  } catch (error) {
    console.error('Failed to sync counters:', error);
  }
}
