// API client for backend communication
import { projectId, publicAnonKey } from './supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a`;
const ANON_KEY = publicAnonKey;

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
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    
    let error;
    try {
      error = JSON.parse(errorText);
    } catch (e) {
      error = { error: errorText || 'Network error' };
    }
    
    console.error(`API error ${response.status} for ${endpoint}:`, error);
    throw new Error(error.error || `API error: ${response.status}`);
  }
  
  return response.json();
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

export async function getUserProfile(userId: string) {
  return apiCall(`/user/${userId}/profile`);
}

export async function updateUserProfile(profileData: any) {
  return apiCall('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
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

export async function getAllOrdersAdmin() {
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

// Clean duplicate products
export async function cleanDuplicateProducts() {
  console.log('🧹 Cleaning duplicate products');
  
  return apiCall('/admin/products/clean-duplicates', {
    method: 'POST',
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