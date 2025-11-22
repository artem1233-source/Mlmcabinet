// API client for backend communication
import { projectId, publicAnonKey } from './supabase/info';
import * as demoApi from './demoApi';

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
  if (demoApi.isDemoMode()) {
    return demoApi.demoGetCurrentUser();
  }
  return apiCall('/user/me');
}

export async function updateProfile(profileData: any) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoUpdateProfile(profileData);
  }
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
  if (demoApi.isDemoMode()) {
    return demoApi.demoGetUserTeam(userId);
  }
  return apiCall(`/user/${userId}/team`);
}

export async function getUserProfile(userId: string) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoGetUserProfile(userId);
  }
  return apiCall(`/user/${userId}/profile`);
}

export async function updateUserProfile(profileData: any) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoUpdateUserProfile(profileData);
  }
  return apiCall('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

// ======================
// PRODUCTS
// ======================

export async function getProducts() {
  if (demoApi.isDemoMode()) {
    return demoApi.demoGetProducts();
  }
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
  
  if (demoApi.isDemoMode()) {
    return demoApi.demoCreateOrder({ sku, isPartner, quantity });
  }
  return apiCall('/orders', {
    method: 'POST',
    body: JSON.stringify({ sku, isPartner, quantity }),
  });
}

export async function getOrders() {
  if (demoApi.isDemoMode()) {
    return demoApi.demoGetOrders();
  }
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
  if (demoApi.isDemoMode()) {
    return demoApi.demoGetEarnings();
  }
  return apiCall('/earnings');
}

// ======================
// WITHDRAWALS
// ======================

export async function requestWithdrawal(amount: number, method: string, details: any) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoRequestWithdrawal({ amount, method, details });
  }
  return apiCall('/withdrawal', {
    method: 'POST',
    body: JSON.stringify({ amount, method, details }),
  });
}

export async function getWithdrawals() {
  if (demoApi.isDemoMode()) {
    return demoApi.demoGetWithdrawals();
  }
  return apiCall('/withdrawals');
}

// ======================
// PAYMENTS
// ======================

export async function getPaymentMethods() {
  if (demoApi.isDemoMode()) {
    return demoApi.demoGetPaymentMethods();
  }
  return apiCall('/payment/methods');
}

export async function createPayment(orderId: string, method: string) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoCreatePayment(orderId, method);
  }
  return apiCall('/payment/create', {
    method: 'POST',
    body: JSON.stringify({ orderId, method }),
  });
}

// ======================
// ADMIN
// ======================

export async function getAdminStats() {
  if (demoApi.isDemoMode()) {
    return demoApi.demoGetAdminStats();
  }
  return apiCall('/admin/stats');
}

export async function getAllUsers() {
  if (demoApi.isDemoMode()) {
    return demoApi.demoGetAllUsers();
  }
  return apiCall('/admin/users');
}

// Debug function - get all users without admin check
export async function debugGetAllUsers() {
  if (demoApi.isDemoMode()) {
    const response = await demoApi.demoGetAllUsers();
    return Array.isArray(response.users) ? response.users : [];
  }
  
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
  if (demoApi.isDemoMode()) {
    return demoApi.demoGetAllUsers();
  }
  return apiCall('/admin/users');
}

export async function getAllOrdersAdmin() {
  if (demoApi.isDemoMode()) {
    return demoApi.demoGetAllOrders();
  }
  return apiCall('/admin/orders');
}

export async function getAllWithdrawalsAdmin() {
  return apiCall('/admin/withdrawals');
}

// Alias for inline admin usage
export async function getAllWithdrawals() {
  if (demoApi.isDemoMode()) {
    return demoApi.demoGetAllWithdrawals();
  }
  return apiCall('/admin/withdrawals');
}

export async function updateWithdrawalStatus(withdrawalId: string, status: string, note?: string) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoUpdateWithdrawalStatus(withdrawalId, status, note);
  }
  return apiCall(`/admin/withdrawals/${withdrawalId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, note }),
  });
}

export async function updateUserLevel(userId: string, level: number) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoSetUserLevel(userId, level);
  }
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
  if (demoApi.isDemoMode()) {
    return demoApi.demoDeleteUser(userId);
  }
  return apiCall(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function clearAllTransactions() {
  if (demoApi.isDemoMode()) {
    return demoApi.demoClearAllTransactions();
  }
  return apiCall('/admin/clear-transactions', {
    method: 'POST',
  });
}

export async function createUser(userData: {
  имя: string;
  фамилия: string;
  уровень: number;
  sponsorId?: string;
}) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoCreateUser(userData);
  }
  return apiCall('/admin/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function moveUser(userId: string, newSponsorId: string) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoMoveUser(userId, newSponsorId);
  }
  return apiCall(`/admin/users/${userId}/move`, {
    method: 'POST',
    body: JSON.stringify({ newSponsorId }),
  });
}

export async function setUserAdmin(userId: string, isAdmin: boolean) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoSetUserAdmin(userId, isAdmin);
  }
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
  console.log('📦 Creating product:', productData);
  console.log('   - commission:', productData.commission);
  console.log('   - retail_price:', productData.retail_price);
  console.log('   - partner_price:', productData.partner_price);
  
  if (demoApi.isDemoMode()) {
    return demoApi.demoCreateProduct(productData);
  }
  return apiCall('/admin/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
}

export async function updateProduct(productId: string, updates: any) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoUpdateProduct(Number(productId), updates);
  }
  return apiCall(`/admin/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteProduct(productId: string) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoDeleteProduct(Number(productId));
  }
  return apiCall(`/admin/products/${productId}`, {
    method: 'DELETE',
  });
}

export async function archiveProduct(productId: string, archive: boolean = true) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoArchiveProduct(Number(productId), archive);
  }
  return apiCall(`/admin/products/${productId}/archive`, {
    method: 'PUT',
    body: JSON.stringify({ archived: archive }),
  });
}

export async function cleanDuplicateProducts() {
  return apiCall('/admin/products/clean-duplicates', {
    method: 'POST',
  });
}

export async function uploadProductImage(file: File) {
  // Always upload images, even in demo mode
  // Demo mode should not interfere with admin image uploads
  
  const formData = new FormData();
  formData.append('file', file);
  
  // Use getAuthToken() to get the current user ID (same as apiCall does)
  const userId = getAuthToken();
  
  console.log('📤 Upload product image:', {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    userId: userId
  });
  
  if (!userId) {
    throw new Error('No user ID found. Please log in again.');
  }
  
  const response = await fetch(
    `${API_BASE}/upload/product-image`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'X-User-Id': userId
      },
      body: formData
    }
  );
  
  console.log('📥 Upload response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    let error;
    try {
      error = JSON.parse(errorText);
    } catch (e) {
      error = { error: errorText };
    }
    console.error('❌ Upload product image error:', error);
    throw new Error(error.error || `Upload failed with status ${response.status}`);
  }
  
  const result = await response.json();
  console.log('✅ Upload successful:', result);
  
  return result;
}

// Alias for inline admin usage - returns { success, url } instead of { success, imageUrl }
export async function uploadImage(file: File) {
  const result = await uploadProductImage(file);
  return {
    success: result.success,
    url: result.imageUrl || result.url
  };
}

// ======================
// TRAINING / COURSES
// ======================

export async function getCourses() {
  if (demoApi.isDemoMode()) {
    return demoApi.demoGetCourses();
  }
  return apiCall('/courses');
}

export async function createCourse(courseData: any) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoCreateCourse(courseData);
  }
  return apiCall('/admin/courses', {
    method: 'POST',
    body: JSON.stringify(courseData),
  });
}

export async function updateCourse(courseId: string, updates: any) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoUpdateCourse(courseId, updates);
  }
  return apiCall(`/admin/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteCourse(courseId: string) {
  if (demoApi.isDemoMode()) {
    return demoApi.demoDeleteCourse(courseId);
  }
  return apiCall(`/admin/courses/${courseId}`, {
    method: 'DELETE',
  });
}

export async function uploadCourseMaterial(file: File) {
  // Всегда загружаем файлы, даже в демо режиме
  const formData = new FormData();
  formData.append('file', file);
  
  const userId = getAuthToken();
  
  console.log('📤 Upload course material:', {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    userId: userId
  });
  
  if (!userId) {
    throw new Error('No user ID found. Please log in again.');
  }
  
  const response = await fetch(
    `${API_BASE}/upload/course-material`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'X-User-Id': userId
      },
      body: formData
    }
  );
  
  console.log('📥 Upload response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    let error;
    try {
      error = JSON.parse(errorText);
    } catch (e) {
      error = { error: errorText };
    }
    console.error('❌ Upload course material error:', error);
    throw new Error(error.error || `Upload failed with status ${response.status}`);
  }
  
  const result = await response.json();
  console.log('✅ Upload successful:', result);
  
  return result;
}

// ======================
// ADMIN - TRAINING (legacy)
// ======================

export async function getAdminTraining() {
  return apiCall('/admin/training');
}

export async function createLesson(lessonData: any) {
  return apiCall('/admin/training', {
    method: 'POST',
    body: JSON.stringify(lessonData),
  });
}

export async function updateLesson(lessonId: string, updates: any) {
  return apiCall(`/admin/training/${lessonId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteLesson(lessonId: string) {
  return apiCall(`/admin/training/${lessonId}`, {
    method: 'DELETE',
  });
}

// ======================
// ADMIN - PROMO CODES
// ======================

export async function getAdminPromos() {
  return apiCall('/admin/promos');
}

export async function createPromo(promoData: any) {
  return apiCall('/admin/promos', {
    method: 'POST',
    body: JSON.stringify(promoData),
  });
}

export async function updatePromo(promoId: string, updates: any) {
  return apiCall(`/admin/promos/${promoId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deletePromo(promoId: string) {
  return apiCall(`/admin/promos/${promoId}`, {
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