// API client for backend communication
import { projectId, publicAnonKey } from './supabase/info';

// Validate Supabase configuration
if (!projectId) {
  console.error('❌ CRITICAL: projectId is not set in supabase/info.tsx');
}
if (!publicAnonKey) {
  console.error('❌ CRITICAL: publicAnonKey is not set in supabase/info.tsx');
}

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a`;
const ANON_KEY = publicAnonKey;

console.log('🔧 API Configuration:');
console.log('  API_BASE:', API_BASE);
console.log('  ANON_KEY:', ANON_KEY ? 'Set ✓' : 'MISSING ✗');

// Store auth token
let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.setItem('auth_token', token);
}

export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem('auth_token');
  }
  return authToken;
}

export function clearAuthToken() {
  authToken = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('access_token');
}

// Helper for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const userId = getAuthToken(); // Actually storing userId as token
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ANON_KEY}`, // Always use anon key for Supabase
    ...options.headers,
  };
  
  // Use custom header for user ID to bypass JWT validation
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  
  const url = `${API_BASE}${endpoint}`;
  console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
  console.log(`🔑 User ID: ${userId || 'NOT SET'}`);
  console.log(`🔑 Anon Key: ${ANON_KEY ? 'Present' : 'MISSING'}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      
      let error;
      try {
        error = JSON.parse(errorText);
      } catch (e) {
        error = { error: errorText || 'Network error' };
      }
      
      console.error(`❌ API error ${response.status} for ${endpoint}:`, error);
      throw new Error(error.error || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ API success:`, data);
    return data;
    
  } catch (error) {
    console.error(`💥 Fetch failed for ${endpoint}:`, error);
    throw error;
  }
}

// ======================
// AUTH
// ======================

export async function login(name: string) {
  const data = await apiCall('/auth', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  
  if (data.token) {
    setAuthToken(data.token);
  }
  
  return data;
}

export async function telegramAuth(telegramData: any) {
  const data = await apiCall('/telegram-auth', {
    method: 'POST',
    body: JSON.stringify(telegramData),
  });
  
  if (data.token) {
    setAuthToken(data.token);
  }
  
  return data;
}

export async function getCurrentUser() {
  return apiCall('/user/me');
}

export async function updateProfile(profileData: any) {
  return apiCall('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

export async function uploadAvatar(formData: FormData) {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/user/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'X-User-Id': userId || '',
    },
    body: formData, // Не добавляем Content-Type, браузер сам установит multipart/form-data
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload avatar');
  }
  
  return response.json();
}

export function logout() {
  clearAuthToken();
}

// ======================
// USERS
// ======================

export async function getUser(userId: string) {
  return apiCall(`/user/${userId}`);
}

export async function getUserTeam(userId: string) {
  return apiCall(`/user/${userId}/team`);
}

export async function getUserRank(userId: string, useCache = true) {
  return apiCall(`/user/${userId}/rank?cache=${useCache}`);
}

export async function getUserProfile(userId: string) {
  return apiCall(`/user/${userId}/profile`);
}

export async function updateUserProfile(profileData: any) {
  return apiCall('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

export async function deleteAccount() {
  return apiCall('/user/account', {
    method: 'DELETE',
  });
}

// ======================
// PRODUCTS
// ======================

export async function getProducts() {
  return apiCall('/products');
}

// ======================
// ORDERS
// ======================

export async function createOrder(sku: string, isPartner: boolean, quantity = 1) {
  // Валидация SKU перед отправкой
  if (!sku || sku.length < 2) {
    console.error('❌ Invalid SKU passed to createOrder:', sku);
    throw new Error(`Некорректный SKU товара: "${sku}". Очистите корзину в настройках.`);
  }
  
  console.log('📦 Creating order with SKU:', sku, 'isPartner:', isPartner, 'quantity:', quantity);
  
  return apiCall('/orders', {
    method: 'POST',
    body: JSON.stringify({ sku, isPartner, quantity }),
  });
}

export async function getOrders() {
  return apiCall('/orders');
}

export async function confirmOrder(orderId: string) {
  return apiCall(`/orders/${orderId}/confirm`, {
    method: 'POST',
  });
}

// ======================
// EARNINGS
// ======================

export async function getEarnings() {
  return apiCall('/earnings');
}

// ======================
// WITHDRAWALS
// ======================

export async function requestWithdrawal(amount: number, method: string, details: any) {
  return apiCall('/withdrawal', {
    method: 'POST',
    body: JSON.stringify({ amount, method, details }),
  });
}

export async function getWithdrawals() {
  return apiCall('/withdrawals');
}

// ======================
// PAYMENTS
// ======================

export async function getPaymentMethods() {
  return apiCall('/payment/methods');
}

export async function createPayment(orderId: string, method: string) {
  return apiCall('/payment/create', {
    method: 'POST',
    body: JSON.stringify({ orderId, method }),
  });
}

// ======================
// ADMIN
// ======================

export async function getAdminStats() {
  return apiCall('/admin/stats');
}

export async function getAllUsers() {
  return apiCall('/admin/users');
}

// Debug function - get all users without admin check
export async function debugGetAllUsers() {
  try {
    const response = await apiCall('/debug/users');
    console.log('debugGetAllUsers response:', response);
    
    if (response.success && response.users) {
      // Ensure it's an array
      if (Array.isArray(response.users)) {
        return response.users;
      } else {
        console.error('response.users is not an array:', response.users);
        return [];
      }
    }
    return [];
  } catch (error) {
    console.error('Debug get all users error:', error);
    return [];
  }
}

export async function getAllUsersAdmin() {
  return apiCall('/admin/users');
}

export async function getFreedIds() {
  return apiCall('/admin/freed-ids');
}

export async function getUsersTree() {
  return apiCall('/admin/users-tree');
}

export async function getIdsStatus() {
  return apiCall('/admin/ids-status');
}

export async function reserveIdsOld(type: 'user' | 'partner', ids: number[], reason?: string) {
  return apiCall('/admin/reserve-ids-old', {
    method: 'POST',
    body: JSON.stringify({ type, ids, reason }),
  });
}

export async function unreserveIdsOld(type: 'user' | 'partner', ids: number[]) {
  return apiCall('/admin/unreserve-ids-old', {
    method: 'POST',
    body: JSON.stringify({ type, ids }),
  });
}

// New ID management functions (001-9999)
export async function getReservedIds() {
  return apiCall('/admin/reserved-ids');
}

export async function reserveIds(ids: string[]) {
  console.log('🟢 API: reserveIds called with:', ids);
  const result = await apiCall('/admin/reserve-ids', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
  console.log('🟢 API: reserveIds result:', result);
  return result;
}

export async function unreserveId(id: string) {
  return apiCall('/admin/unreserve-id', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export async function syncReservedIds() {
  return apiCall('/admin/sync-reserved-ids', {
    method: 'POST',
  });
}

export async function assignReservedId(newId: string, userId: string) {
  return apiCall('/admin/assign-reserved-id', {
    method: 'POST',
    body: JSON.stringify({ newId, userId }),
  });
}

export async function cleanBrokenRefs() {
  return apiCall('/admin/clean-broken-refs', {
    method: 'POST',
  });
}

export async function cleanDuplicateAdmins() {
  const accessToken = localStorage.getItem('access_token');
  
  console.log('🧹 cleanDuplicateAdmins called');
  console.log('  accessToken:', accessToken ? 'Present ✓' : 'MISSING ✗');
  
  if (!accessToken) {
    throw new Error('Access token not found. Please log in again.');
  }
  
  const userId = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };
  
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  
  const url = `${API_BASE}/admin/clean-duplicate-admins`;
  console.log('🌐 Calling:', url);
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);
    
    const responseText = await response.text();
    console.log('📡 Response text:', responseText);
    
    if (!response.ok) {
      console.error('❌ Error response:', responseText);
      let error;
      try {
        error = JSON.parse(responseText);
      } catch (e) {
        error = { error: responseText || 'Network error' };
      }
      throw new Error(error.error || `API error: ${response.status}`);
    }
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse response:', e);
      throw new Error('Invalid JSON response from server');
    }
    
    console.log('✅ Success:', result);
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error('❌ Request timeout after 30 seconds');
      throw new Error('Запрос превысил время ожидания (30 сек). Попробуйте снова.');
    }
    
    console.error('❌ Request error:', error);
    throw error;
  }
}

export async function cleanDuplicateProducts() {
  console.log('🧹 Cleaning duplicate products');
  
  return apiCall('/admin/products/clean-duplicates', {
    method: 'POST',
  });
}

export async function syncTeams() {
  return apiCall('/admin/sync-teams', {
    method: 'POST',
  });
}

export async function changeUserId(oldId: string, newId: string) {
  return apiCall('/admin/change-user-id', {
    method: 'POST',
    body: JSON.stringify({ oldId, newId }),
  });
}

export async function changeUserRole(adminId: string, newRole: string) {
  const accessToken = localStorage.getItem('access_token');
  
  if (!accessToken) {
    throw new Error('Access token not found. Please log in again.');
  }
  
  return apiCall('/auth/update-admin-role', {
    method: 'POST',
    body: JSON.stringify({ adminId, newRole, creatorToken: accessToken }),
  });
}

export async function getAllOrdersAdmin() {
  return apiCall('/admin/orders');
}

export async function getAllOrders() {
  return apiCall('/admin/orders');
}

export async function getAllWithdrawalsAdmin() {
  return apiCall('/admin/withdrawals');
}

// Alias for inline admin usage
export async function getAllWithdrawals() {
  return apiCall('/admin/withdrawals');
}

export async function updateWithdrawalStatus(withdrawalId: string, status: string, note?: string) {
  return apiCall(`/admin/withdrawals/${withdrawalId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, note }),
  });
}

export async function updateUserLevel(userId: string, level: number) {
  return apiCall(`/admin/users/${userId}/level`, {
    method: 'POST',
    body: JSON.stringify({ level }),
  });
}

export async function adjustUserBalance(userId: string, amount: number, reason: string) {
  return apiCall(`/admin/users/${userId}/balance`, {
    method: 'POST',
    body: JSON.stringify({ amount, reason }),
  });
}

export async function deleteUserAdmin(userId: string) {
  return apiCall(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function clearAllTransactions() {
  return apiCall('/admin/clear-transactions', {
    method: 'POST',
  });
}

export async function testServerConnection() {
  console.log('🔌 Testing server connection...');
  try {
    const response = await apiCall('/health');
    console.log('✅ Server connection test passed:', response);
    return response;
  } catch (error) {
    console.error('❌ Server connection test failed:', error);
    throw error;
  }
}

export async function testAdminConnection() {
  console.log('🔌 Testing admin endpoints connection...');
  try {
    const response = await apiCall('/admin/health');
    console.log('✅ Admin connection test passed:', response);
    return response;
  } catch (error) {
    console.error('❌ Admin connection test failed:', error);
    throw error;
  }
}

export async function getCounterInfo() {
  return apiCall('/admin/counter');
}

export async function resetCounter() {
  return apiCall('/admin/reset-counter', {
    method: 'POST',
  });
}

export async function createUser(userData: {
  имя: string;
  фамилия: string;
  уровень: number;
  sponsorId?: string;
}) {
  return apiCall('/admin/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function moveUser(userId: string, newSponsorId: string) {
  return apiCall(`/admin/users/${userId}/move`, {
    method: 'POST',
    body: JSON.stringify({ newSponsorId }),
  });
}

export async function setUserAdmin(userId: string, isAdmin: boolean) {
  return apiCall(`/admin/users/${userId}/set-admin`, {
    method: 'POST',
    body: JSON.stringify({ isAdmin }),
  });
}

// ======================
// ADMIN - PRODUCTS
// ======================

export async function getAdminProducts() {
  return apiCall('/admin/products');
}

export async function createProduct(productData: any) {
  console.log('📦 API createProduct called');
  console.log('📦 Creating product:', productData);
  console.log('   - commission:', productData.commission);
  console.log('   - retail_price:', productData.retail_price);
  console.log('   - partner_price:', productData.partner_price);
  
  return apiCall('/admin/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
}

export async function updateProduct(productId: string, updates: any) {
  console.log('📦 Updating product:', productId, updates);
  
  return apiCall(`/admin/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteProduct(productId: string) {
  console.log('📦 Deleting product:', productId);
  
  return apiCall(`/admin/products/${productId}`, {
    method: 'DELETE',
  });
}

// Archive/restore product
export async function archiveProduct(productId: string, archive: boolean = true) {
  console.log('📦 Archiving product:', productId, archive);
  
  return apiCall(`/admin/products/${productId}/archive`, {
    method: 'POST',
    body: JSON.stringify({ archive }),
  });
}

// Upload product image
export async function uploadImage(file: File) {
  console.log('📤 Uploading image:', file.name, file.type, file.size);
  
  const formData = new FormData();
  formData.append('file', file);
  
  const userId = getAuthToken();
  const headers: HeadersInit = {
    'Authorization': `Bearer ${ANON_KEY}`,
  };
  
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  
  const response = await fetch(`${API_BASE}/admin/products/upload-image`, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let error;
    try {
      error = JSON.parse(errorText);
    } catch (e) {
      error = { error: errorText || 'Upload failed' };
    }
    throw new Error(error.error || `Upload failed: ${response.status}`);
  }
  
  return response.json();
}

// Legacy compatibility
export async function uploadProductImage(file: File) {
  return uploadImage(file);
}

// ======================
// NOTIFICATIONS
// ======================

export async function getNotifications() {
  return apiCall('/notifications');
}

export async function markNotificationAsRead(notificationId: string) {
  return apiCall(`/notifications/${notificationId}/read`, {
    method: 'POST',
  });
}

export async function markAllNotificationsAsRead() {
  return apiCall('/notifications/mark-all-read', {
    method: 'POST',
  });
}

export async function deleteNotification(notificationId: string) {
  return apiCall(`/notifications/${notificationId}`, {
    method: 'DELETE',
  });
}

export async function sendNotificationToUser(userId: string, notificationData: {
  тип: string;
  заголовок: string;
  сообщение: string;
}) {
  return apiCall('/admin/send-notification', {
    method: 'POST',
    body: JSON.stringify({ userId, ...notificationData }),
  });
}
// ======================
// ADMIN - MLM SETTINGS
// ======================

export async function getAdminSettings() {
  return apiCall('/admin/settings');
}

export async function updateAdminSettings(settings: any) {
  return apiCall('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// ======================
// ADMIN - LOGS & ANALYTICS
// ======================

export async function getAdminLogs() {
  return apiCall('/admin/logs');
}

export async function getAdminAnalytics() {
  return apiCall('/admin/analytics');
}

// ======================
// GAMIFICATION
// ======================

export async function getAchievements() {
  return apiCall('/achievements');
}

export async function getChallenges() {
  return apiCall('/challenges');
}

export async function getLeaderboard() {
  return apiCall('/leaderboard');
}

// ======================
// ACHIEVEMENTS ADMIN
// ======================

export async function getAchievementsAdmin() {
  return apiCall('/admin/achievements');
}

export async function createAchievement(achievementData: any) {
  return apiCall('/admin/achievements', {
    method: 'POST',
    body: JSON.stringify(achievementData)
  });
}

export async function updateAchievement(id: string, achievementData: any) {
  return apiCall(`/admin/achievements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(achievementData)
  });
}

export async function deleteAchievement(id: string) {
  return apiCall(`/admin/achievements/${id}`, {
    method: 'DELETE'
  });
}

// ======================
// CHALLENGES ADMIN
// ======================

export async function getChallengesAdmin() {
  return apiCall('/admin/challenges');
}

export async function createChallenge(challengeData: any) {
  return apiCall('/admin/challenges', {
    method: 'POST',
    body: JSON.stringify(challengeData)
  });
}

export async function updateChallenge(id: string, challengeData: any) {
  return apiCall(`/admin/challenges/${id}`, {
    method: 'PUT',
    body: JSON.stringify(challengeData)
  });
}

export async function deleteChallenge(id: string) {
  return apiCall(`/admin/challenges/${id}`, {
    method: 'DELETE'
  });
}

// ======================
// COURSES / TRAINING
// ======================

export async function getCourses() {
  return apiCall('/courses');
}

export async function createCourse(courseData: any) {
  return apiCall('/admin/courses', {
    method: 'POST',
    body: JSON.stringify(courseData),
  });
}

export async function updateCourse(courseId: string, courseData: any) {
  return apiCall(`/admin/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(courseData),
  });
}

export async function deleteCourse(courseId: string) {
  return apiCall(`/admin/courses/${courseId}`, {
    method: 'DELETE',
  });
}

export async function uploadCourseMaterial(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const userId = getAuthToken();
  const headers: HeadersInit = {
    'Authorization': `Bearer ${ANON_KEY}`,
  };
  
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  
  const response = await fetch(`${API_BASE}/admin/courses/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Upload failed');
  }
  
  return response.json();
}

// ======================
// TRAINING MATERIALS
// ======================

export async function getTrainingMaterials() {
  return apiCall('/training-materials');
}

export async function createTrainingMaterial(materialData: any) {
  return apiCall('/admin/training-materials', {
    method: 'POST',
    body: JSON.stringify(materialData),
  });
}

export async function updateTrainingMaterial(materialId: string, materialData: any) {
  return apiCall(`/admin/training-materials/${materialId}`, {
    method: 'PUT',
    body: JSON.stringify(materialData),
  });
}

export async function deleteTrainingMaterial(materialId: string) {
  return apiCall(`/admin/training-materials/${materialId}`, {
    method: 'DELETE',
  });
}

// ======================
// ADMIN - ORDERS
// ======================

export async function updateOrderStatus(orderId: string, status: string) {
  return apiCall(`/admin/orders/${orderId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}