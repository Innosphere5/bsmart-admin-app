import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Dynamically resolve backend API base URL
 * Handles Expo Go physical devices, Android emulator, iOS simulator, & Web
 */
const PRODUCTION_API_URL = 'https://admin-app-backend-i5tk.onrender.com';
const SUPABASE_REST_URL = 'https://rxnvxqrzgecynpxjobkh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XPwu7-Cx7wQHzSOAeuB2rA_JSvjvTCd';
const LOCAL_PORT = 5000;
const CURRENT_LOCAL_IP = '10.53.190.144';

/**
 * Dynamically extract host IP of the developer's computer.
 * Works across iOS Simulator, iOS physical device (Expo Go), Android Emulator, and physical phones.
 */
export function getDevHostIp() {
  // 1. Check explicit EXPO_PUBLIC_LOCAL_IP environment variable
  if (process.env.EXPO_PUBLIC_LOCAL_IP && typeof process.env.EXPO_PUBLIC_LOCAL_IP === 'string') {
    const rawIp = process.env.EXPO_PUBLIC_LOCAL_IP.trim();
    if (rawIp && rawIp !== 'localhost' && rawIp !== '127.0.0.1') {
      return rawIp;
    }
  }

  // 2. Check React Native NativeModules.SourceCode.scriptURL (Most accurate across all Expo/RN versions)
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL && typeof scriptURL === 'string') {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch (e) {}

  // 3. Check Constants.expoConfig?.hostUri or debuggerHost (Expo Go / Dev Client)
  try {
    const hostUri = Constants.expoConfig?.hostUri || 
                    Constants.manifest?.debuggerHost || 
                    Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri && typeof hostUri === 'string') {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }
  } catch (e) {}

  // 4. Check deep linking URI or experienceUrl
  try {
    const uri = Constants.linkingUri || Constants.experienceUrl;
    if (uri && typeof uri === 'string') {
      const match = uri.match(/:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch (e) {}

  // 5. Fallback to active local development machine IP
  return CURRENT_LOCAL_IP;
}

/**
 * Dynamically resolve backend API base URL
 */
const getApiBaseUrl = () => {
  // In development mode (__DEV__ === true), prioritize local machine backend
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // Web browser running on developer machine
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.location?.hostname && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        return PRODUCTION_API_URL;
      }
      return `http://localhost:${LOCAL_PORT}`;
    }

    // Android emulator special localhost alias
    if (Platform.OS === 'android') {
      const hostIp = getDevHostIp();
      // If hostIp was dynamically discovered from Metro/Expo, use it so real devices work
      if (hostIp && hostIp !== CURRENT_LOCAL_IP) {
        return `http://${hostIp}:${LOCAL_PORT}`;
      }
      // Check if running on real device vs emulator
      const isEmulator = !Constants.isDevice;
      if (isEmulator) {
        return `http://10.0.2.2:${LOCAL_PORT}`;
      }
      return `http://${hostIp}:${LOCAL_PORT}`;
    }

    // iOS (Simulator or physical device with Expo Go)
    const hostIp = getDevHostIp();
    return `http://${hostIp}:${LOCAL_PORT}`;
  }

  // Explicit environment variable override
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Production release builds (EAS build, standalone APK/bundle, deployed web)
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    return PRODUCTION_API_URL;
  }

  return `http://${getDevHostIp()}:${LOCAL_PORT}`;
};

export const API_BASE_URL = getApiBaseUrl();

console.log('🔗 Expo API Base URL configured as:', API_BASE_URL);

/**
 * Upload an image to Cloudinary via backend API
 * @param {string} imageUri - Base64 data URI or image URL
 * @returns {Promise<{url: string, optimizedUrl: string, public_id: string}>}
 */
export async function uploadImageToCloudinary(imageUri) {
  try {
    let payloadImage = imageUri;

    // Check if payload is already data URI or HTTP link
    if (!imageUri.startsWith('data:image/') && !imageUri.startsWith('http://') && !imageUri.startsWith('https://')) {
      console.warn('Image URI is a raw local path, attempting direct transmission...');
    }

    console.log(`Sending image payload to ${API_BASE_URL}/api/upload...`);

    const res = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ image: payloadImage }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server returned HTTP ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Cloudinary upload failed');
    }

    return data;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error.message || error);
    throw error;
  }
}

/**
 * Publish product to backend database
 * @param {Object} productData 
 */
export async function createProduct(productData) {
  try {
    console.log(`Publishing product to ${API_BASE_URL}/api/products...`);
    const res = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server returned HTTP ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to create product');
    }

    return data.product;
  } catch (error) {
    console.error('Error creating product:', error.message || error);
    throw error;
  }
}

/**
 * Update an existing product in backend database
 * @param {string} id 
 * @param {Object} productData 
 */
export async function updateProduct(id, productData) {
  try {
    console.log(`Updating product ${id} at ${API_BASE_URL}/api/products/${id}...`);
    const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server returned HTTP ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to update product');
    }

    return data.product;
  } catch (error) {
    console.error(`Error updating product ${id}:`, error.message || error);
    throw error;
  }
}

/**
 * Delete product from backend database
 * @param {string} id 
 */
export async function deleteProduct(id) {
  try {
    console.log(`Deleting product ${id} from ${API_BASE_URL}/api/products/${id}...`);
    const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server returned HTTP ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    return data.success;
  } catch (error) {
    console.error(`Error deleting product ${id}:`, error.message || error);
    throw error;
  }
}

/**
 * Fetch all products from backend
 */
export async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/products`);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.success) {
      return data.products;
    }
    return [];
  } catch (error) {
    console.error('Error fetching products:', error.message || error);
    return [];
  }
}

/**
 * Fetch all orders with optional status and search filter
 */
export async function fetchOrders(status = 'All', search = '') {
  try {
    const params = new URLSearchParams();
    if (status && status !== 'All') params.append('status', status);
    if (search) params.append('search', search);

    const url = `${API_BASE_URL}/api/orders?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.success) {
      return data.orders || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching orders:', error.message || error);
    return [];
  }
}

/**
 * Fetch single order by ID
 */
export async function fetchOrderById(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/orders/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success) {
      return data.order;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching order ${id}:`, error.message || error);
    return null;
  }
}

/**
 * Update order status (Accept with Delivery Time or Decline with Reason)
 */
export async function updateOrderStatus(id, statusPayload) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/orders/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(statusPayload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update order status: ${errorText}`);
    }

    const data = await res.json();
    return data.order;
  } catch (error) {
    console.error(`Error updating order ${id} status:`, error.message || error);
    throw error;
  }
}

/**
 * Helper to get all candidate backend base URLs (current, local, LAN)
 */
function getCandidateBaseUrls() {
  const urls = [];
  if (API_BASE_URL) urls.push(API_BASE_URL);

  const hostIp = getDevHostIp();
  if (hostIp) {
    const lanUrl = `http://${hostIp}:${LOCAL_PORT}`;
    if (!urls.includes(lanUrl)) urls.push(lanUrl);
  }

  const fallbackLan = `http://${CURRENT_LOCAL_IP}:${LOCAL_PORT}`;
  if (!urls.includes(fallbackLan)) urls.push(fallbackLan);

  if (Platform.OS === 'web' || Platform.OS === 'ios') {
    if (!urls.includes(`http://localhost:${LOCAL_PORT}`)) urls.push(`http://localhost:${LOCAL_PORT}`);
  }
  if (Platform.OS === 'android') {
    if (!urls.includes(`http://10.0.2.2:${LOCAL_PORT}`)) urls.push(`http://10.0.2.2:${LOCAL_PORT}`);
  }
  if (!urls.includes(PRODUCTION_API_URL)) urls.push(PRODUCTION_API_URL);

  return urls;
}

/**
 * Permanently delete an order from backend database with resilient multi-tier fallback
 */
export async function deleteOrder(id) {
  const cleanId = String(id).trim();
  const rawId = cleanId.replace(/^#/, '');
  const candidateUrls = getCandidateBaseUrls();

  let lastError = null;

  // 1. Try candidate backend servers (both DELETE and POST /delete)
  for (const baseUrl of candidateUrls) {
    // Attempt A: DELETE /api/orders/:id
    try {
      const res = await fetch(`${baseUrl}/api/orders/${encodeURIComponent(cleanId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ id: cleanId, orderId: cleanId }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({ success: true }));
        console.log(`✅ Order ${cleanId} deleted via ${baseUrl} (DELETE)`);
        return data;
      }
    } catch (e) {
      lastError = e;
    }

    // Attempt B: POST /api/orders/:id/delete (handles proxies/hosts that block HTTP DELETE)
    try {
      const res = await fetch(`${baseUrl}/api/orders/${encodeURIComponent(cleanId)}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ id: cleanId, orderId: cleanId }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({ success: true }));
        console.log(`✅ Order ${cleanId} deleted via ${baseUrl} (POST delete)`);
        return data;
      }
    } catch (e) {
      lastError = e;
    }
  }

  // 2. Direct Supabase REST Fallback (guaranteed to delete even if remote Render server is outdated or down)
  try {
    console.log(`⚡ Falling back to direct Supabase deletion for Order ${cleanId}...`);
    const supabaseUrl = `${SUPABASE_REST_URL}/rest/v1/orders?or=(id.eq.${encodeURIComponent(cleanId)},order_number.eq.${encodeURIComponent(cleanId)},id.eq.${encodeURIComponent(rawId)},order_number.eq.${encodeURIComponent(rawId)})`;
    const res = await fetch(supabaseUrl, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });

    if (res.ok) {
      console.log(`✅ Order ${cleanId} deleted directly from Supabase`);
      return { success: true, message: `Order ${cleanId} deleted successfully` };
    }
  } catch (supabaseErr) {
    console.warn('Direct Supabase delete notice:', supabaseErr.message);
  }

  throw new Error(`Failed to delete order ${cleanId}. Please check network connection.`);
}

/**
 * Get PDF URL for direct viewing / download
 */
export function getOrderPdfUrl(id) {
  return `${API_BASE_URL}/api/orders/${id}/pdf`;
}

/**
 * Fetch live notifications
 */
export async function fetchNotifications(role = 'admin') {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications?role=${role}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.success) {
      return data.notifications || [];
    }
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, { method: 'POST' });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(role = 'admin') {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

/**
 * SSE Real-time Stream URL
 */
export function getRealtimeStreamUrl() {
  return `${API_BASE_URL}/api/realtime/stream`;
}

/**
 * Helper: Direct Supabase REST fetch of Master Registry
 */
async function fetchMasterRegistryDirectFromSupabase() {
  try {
    const url = `${SUPABASE_REST_URL}/rest/v1/notifications?id=eq.sys_master_registry&select=message`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].message) {
        return JSON.parse(data[0].message);
      }
    }
  } catch (e) {
    console.warn('Direct Supabase master fetch warning:', e.message);
  }
  return null;
}

/**
 * Helper: Direct Supabase REST save/update of Master Registry
 */
async function saveMasterRegistryDirectToSupabase(modifierFn) {
  try {
    let current = await fetchMasterRegistryDirectFromSupabase();
    if (!current || typeof current !== 'object') {
      current = {
        schools: [],
        classes: [],
        categories: [],
        deletedSchools: [],
        deletedClasses: [],
        deletedCategories: [],
      };
    }

    const updated = modifierFn(current);
    const payload = {
      id: 'sys_master_registry',
      order_id: 'SYSTEM',
      type: 'system_masters',
      title: 'System Master Registry',
      message: JSON.stringify({
        ...updated,
        updatedAt: new Date().toISOString(),
      }),
      target_role: 'system',
      read: true,
      created_at: new Date().toISOString(),
    };

    await fetch(`${SUPABASE_REST_URL}/rest/v1/notifications`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });
    return updated;
  } catch (e) {
    console.warn('Direct Supabase master save warning:', e.message);
  }
  return null;
}

/**
 * Fetch categories dynamically from backend with direct Supabase fallback
 */
export async function fetchCategories() {
  const candidateUrls = getCandidateBaseUrls();
  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/categories`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.categories)) {
          return data.categories;
        }
      }
    } catch (e) {}
  }

  const direct = await fetchMasterRegistryDirectFromSupabase();
  if (direct && Array.isArray(direct.categories)) {
    const deleted = new Set((direct.deletedCategories || []).map((c) => String(c).trim().toLowerCase()));
    return direct.categories.filter((c) => c && !deleted.has(String(c).trim().toLowerCase()));
  }

  return null;
}

/**
 * Save new category to backend and Supabase directly
 */
export async function createCategory(category) {
  const cleanName = String(category).trim();
  const candidateUrls = getCandidateBaseUrls();

  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cleanName }),
      });
      if (res.ok) break;
    } catch (e) {}
  }

  await saveMasterRegistryDirectToSupabase((reg) => {
    const lower = cleanName.toLowerCase();
    const categories = (reg.categories || []).filter((c) => c.trim().toLowerCase() !== lower);
    categories.push(cleanName);
    const deletedCategories = (reg.deletedCategories || []).filter((c) => c.trim().toLowerCase() !== lower);
    return { ...reg, categories, deletedCategories };
  });

  return { success: true, category: cleanName };
}

/**
 * Update / Rename an existing category
 */
export async function updateCategory(oldName, newName) {
  const cleanOld = String(oldName).trim();
  const cleanNew = String(newName).trim();
  const candidateUrls = getCandidateBaseUrls();

  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/categories/${encodeURIComponent(cleanOld)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: cleanNew }),
      });
      if (res.ok) break;
    } catch (e) {}
  }

  await saveMasterRegistryDirectToSupabase((reg) => {
    const lowerOld = cleanOld.toLowerCase();
    const lowerNew = cleanNew.toLowerCase();
    let categories = (reg.categories || []).filter((c) => c.trim().toLowerCase() !== lowerOld);
    if (!categories.some((c) => c.trim().toLowerCase() === lowerNew)) {
      categories.push(cleanNew);
    }
    let deletedCategories = (reg.deletedCategories || []).filter((c) => c.trim().toLowerCase() !== lowerNew);
    if (!deletedCategories.some((c) => c.trim().toLowerCase() === lowerOld)) {
      deletedCategories.push(cleanOld);
    }
    return { ...reg, categories, deletedCategories };
  });

  // Direct Supabase product category update
  try {
    await fetch(`${SUPABASE_REST_URL}/rest/v1/products?category=ilike.${encodeURIComponent(cleanOld)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ category: cleanNew }),
    });
  } catch (e) {}

  return { success: true, oldName: cleanOld, newName: cleanNew };
}

/**
 * Delete a category from backend and Supabase directly
 */
export async function deleteCategory(categoryName) {
  const cleanName = String(categoryName).trim();
  const candidateUrls = getCandidateBaseUrls();

  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/categories/${encodeURIComponent(cleanName)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ category: cleanName }),
      });
      if (res.ok) break;
    } catch (e) {}
  }

  await saveMasterRegistryDirectToSupabase((reg) => {
    const lower = cleanName.toLowerCase();
    const categories = (reg.categories || []).filter((c) => c.trim().toLowerCase() !== lower);
    const deletedCategories = reg.deletedCategories || [];
    if (!deletedCategories.some((c) => c.trim().toLowerCase() === lower)) {
      deletedCategories.push(cleanName);
    }
    return { ...reg, categories, deletedCategories };
  });

  // Reset category to 'General' in Supabase products
  try {
    await fetch(`${SUPABASE_REST_URL}/rest/v1/products?category=ilike.${encodeURIComponent(cleanName)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ category: 'General' }),
    });
  } catch (e) {}

  return { success: true, deleted: cleanName };
}

/**
 * Fetch schools dynamically from backend with direct Supabase fallback
 */
export async function fetchSchools() {
  const candidateUrls = getCandidateBaseUrls();
  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/schools`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.schools)) {
          return data.schools;
        }
      }
    } catch (e) {}
  }

  const direct = await fetchMasterRegistryDirectFromSupabase();
  if (direct && Array.isArray(direct.schools)) {
    const deleted = new Set((direct.deletedSchools || []).map((s) => String(s).trim().toLowerCase()));
    return direct.schools.filter((s) => s && !deleted.has(String(s).trim().toLowerCase()));
  }

  return null;
}

/**
 * Save new school to backend and Supabase directly
 */
export async function createSchool(school) {
  const cleanName = String(school).trim();
  const candidateUrls = getCandidateBaseUrls();

  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school: cleanName }),
      });
      if (res.ok) break;
    } catch (e) {}
  }

  await saveMasterRegistryDirectToSupabase((reg) => {
    const lower = cleanName.toLowerCase();
    const schools = (reg.schools || []).filter((s) => s.trim().toLowerCase() !== lower);
    schools.push(cleanName);
    const deletedSchools = (reg.deletedSchools || []).filter((s) => s.trim().toLowerCase() !== lower);
    return { ...reg, schools, deletedSchools };
  });

  return { success: true, school: cleanName };
}

/**
 * Update / Rename an existing school in backend and Supabase directly
 */
export async function updateSchool(oldName, newName) {
  const cleanOld = String(oldName).trim();
  const cleanNew = String(newName).trim();
  const candidateUrls = getCandidateBaseUrls();

  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/schools/${encodeURIComponent(cleanOld)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: cleanNew }),
      });
      if (res.ok) break;
    } catch (e) {}
  }

  await saveMasterRegistryDirectToSupabase((reg) => {
    const lowerOld = cleanOld.toLowerCase();
    const lowerNew = cleanNew.toLowerCase();
    let schools = (reg.schools || []).filter((s) => s.trim().toLowerCase() !== lowerOld);
    if (!schools.some((s) => s.trim().toLowerCase() === lowerNew)) {
      schools.push(cleanNew);
    }
    let deletedSchools = (reg.deletedSchools || []).filter((s) => s.trim().toLowerCase() !== lowerNew);
    if (!deletedSchools.some((s) => s.trim().toLowerCase() === lowerOld)) {
      deletedSchools.push(cleanOld);
    }
    return { ...reg, schools, deletedSchools };
  });

  // Direct Supabase product school update
  try {
    await fetch(`${SUPABASE_REST_URL}/rest/v1/products?school=ilike.${encodeURIComponent(cleanOld)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ school: cleanNew }),
    });
  } catch (e) {}

  return { success: true, oldName: cleanOld, newName: cleanNew };
}

/**
 * Delete a school from backend and Supabase directly
 */
export async function deleteSchool(schoolName) {
  const cleanName = String(schoolName).trim();
  const candidateUrls = getCandidateBaseUrls();

  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/schools/${encodeURIComponent(cleanName)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ school: cleanName }),
      });
      if (res.ok) break;
    } catch (e) {}
  }

  await saveMasterRegistryDirectToSupabase((reg) => {
    const lower = cleanName.toLowerCase();
    const schools = (reg.schools || []).filter((s) => s.trim().toLowerCase() !== lower);
    const deletedSchools = reg.deletedSchools || [];
    if (!deletedSchools.some((s) => s.trim().toLowerCase() === lower)) {
      deletedSchools.push(cleanName);
    }
    return { ...reg, schools, deletedSchools };
  });

  // Reset school to 'General School' in Supabase products
  try {
    await fetch(`${SUPABASE_REST_URL}/rest/v1/products?school=ilike.${encodeURIComponent(cleanName)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ school: 'General School' }),
    });
  } catch (e) {}

  return { success: true, deleted: cleanName };
}

/**
 * Fetch classes dynamically from backend with direct Supabase fallback
 */
export async function fetchClasses() {
  const candidateUrls = getCandidateBaseUrls();
  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/classes`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.classes)) {
          return data.classes;
        }
      }
    } catch (e) {}
  }

  const direct = await fetchMasterRegistryDirectFromSupabase();
  if (direct && Array.isArray(direct.classes)) {
    const deleted = new Set((direct.deletedClasses || []).map((c) => String(c).trim().toLowerCase()));
    return direct.classes.filter((c) => c && !deleted.has(String(c).trim().toLowerCase()));
  }

  return null;
}

/**
 * Save new class to backend and Supabase directly
 */
export async function createClass(className) {
  const cleanName = String(className).trim();
  const candidateUrls = getCandidateBaseUrls();

  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className: cleanName }),
      });
      if (res.ok) break;
    } catch (e) {}
  }

  await saveMasterRegistryDirectToSupabase((reg) => {
    const lower = cleanName.toLowerCase();
    const classes = (reg.classes || []).filter((c) => c.trim().toLowerCase() !== lower);
    classes.push(cleanName);
    const deletedClasses = (reg.deletedClasses || []).filter((c) => c.trim().toLowerCase() !== lower);
    return { ...reg, classes, deletedClasses };
  });

  return { success: true, className: cleanName, class: cleanName };
}

/**
 * Update / Rename an existing class in backend and Supabase directly
 */
export async function updateClass(oldName, newName) {
  const cleanOld = String(oldName).trim();
  const cleanNew = String(newName).trim();
  const candidateUrls = getCandidateBaseUrls();

  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/classes/${encodeURIComponent(cleanOld)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: cleanNew }),
      });
      if (res.ok) break;
    } catch (e) {}
  }

  await saveMasterRegistryDirectToSupabase((reg) => {
    const lowerOld = cleanOld.toLowerCase();
    const lowerNew = cleanNew.toLowerCase();
    let classes = (reg.classes || []).filter((c) => c.trim().toLowerCase() !== lowerOld);
    if (!classes.some((c) => c.trim().toLowerCase() === lowerNew)) {
      classes.push(cleanNew);
    }
    let deletedClasses = (reg.deletedClasses || []).filter((c) => c.trim().toLowerCase() !== lowerNew);
    if (!deletedClasses.some((c) => c.trim().toLowerCase() === lowerOld)) {
      deletedClasses.push(cleanOld);
    }
    return { ...reg, classes, deletedClasses };
  });

  // Direct Supabase product applicable_class update
  try {
    await fetch(`${SUPABASE_REST_URL}/rest/v1/products?applicable_class=ilike.${encodeURIComponent(cleanOld)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ applicable_class: cleanNew }),
    });
  } catch (e) {}

  return { success: true, oldName: cleanOld, newName: cleanNew };
}

/**
 * Delete a class from backend and Supabase directly
 */
export async function deleteClass(className) {
  const cleanName = String(className).trim();
  const candidateUrls = getCandidateBaseUrls();

  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/classes/${encodeURIComponent(cleanName)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ className: cleanName }),
      });
      if (res.ok) break;
    } catch (e) {}
  }

  await saveMasterRegistryDirectToSupabase((reg) => {
    const lower = cleanName.toLowerCase();
    const classes = (reg.classes || []).filter((c) => c.trim().toLowerCase() !== lower);
    const deletedClasses = reg.deletedClasses || [];
    if (!deletedClasses.some((c) => c.trim().toLowerCase() === lower)) {
      deletedClasses.push(cleanName);
    }
    return { ...reg, classes, deletedClasses };
  });

  // Reset class to 'All Classes' in Supabase products
  try {
    await fetch(`${SUPABASE_REST_URL}/rest/v1/products?applicable_class=ilike.${encodeURIComponent(cleanName)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ applicable_class: 'All Classes' }),
    });
  } catch (e) {}

  return { success: true, deleted: cleanName };
}

// ============================================================================
// SHOP STATUS & STORE CLOSURE BANNER MANAGEMENT
// ============================================================================

/**
 * Format real calendar date into a readable string (e.g., "Saturday, 10 Oct 2026")
 */
export function formatIndianDate(dateInput) {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return '';
  }
}

/**
 * Calculate reopening date based on starting date and number of closure days
 */
export function calculateReopenDate(days, startDate = new Date()) {
  const start = new Date(startDate);
  const reopen = new Date(start.getTime() + Math.max(1, Number(days) || 1) * 24 * 60 * 60 * 1000);
  return {
    reopenDate: reopen.toISOString(),
    reopenDateFormatted: formatIndianDate(reopen),
  };
}

/**
 * Returns default shop status model (2 days closed by default)
 */
export function getDefaultShopStatus() {
  const now = new Date();
  const reopen = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const formatted = formatIndianDate(reopen);

  return {
    isClosed: false,
    closureDays: 2,
    startDate: now.toISOString(),
    reopenDate: reopen.toISOString(),
    reopenDateFormatted: formatted,
    bannerTitle: 'Shop Temporarily Closed for 2 Days',
    bannerMessage: `Our shop is closed for 2 days. We will reopen on ${formatted}. Online orders placed now will be processed as soon as we reopen!`,
    allowOrders: true,
    showPopup: true,
    showTopBanner: true,
    updatedAt: now.toISOString(),
  };
}

/**
 * Direct Supabase REST fetch of Shop Status
 */
async function fetchShopStatusDirectFromSupabase() {
  try {
    const url = `${SUPABASE_REST_URL}/rest/v1/notifications?id=eq.sys_shop_status&select=message`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].message) {
        const parsed = JSON.parse(data[0].message);
        if (parsed && typeof parsed === 'object') {
          if (parsed.reopenDate && !parsed.reopenDateFormatted) {
            parsed.reopenDateFormatted = formatIndianDate(parsed.reopenDate);
          }
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Direct Supabase shop status fetch notice:', e.message);
  }
  return null;
}

/**
 * Direct Supabase REST save/upsert of Shop Status
 */
async function saveShopStatusDirectToSupabase(statusData) {
  try {
    const payload = {
      id: 'sys_shop_status',
      order_id: 'SYSTEM',
      type: 'shop_status',
      title: 'Shop Status & Closure Banner',
      message: JSON.stringify({
        ...statusData,
        updatedAt: new Date().toISOString(),
      }),
      target_role: 'all',
      read: true,
      created_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_REST_URL}/rest/v1/notifications`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (e) {
    console.warn('Direct Supabase shop status save notice:', e.message);
    return false;
  }
}

/**
 * Fetch Shop Status and Closure Banner settings
 */
export async function fetchShopStatus() {
  // 1. Try backend API endpoints
  const candidateUrls = getCandidateBaseUrls();
  for (const baseUrl of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${baseUrl}/api/shop-status`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.shopStatus) {
          return data.shopStatus;
        }
      }
    } catch (e) {}
  }

  // 2. Direct Supabase REST Fallback
  const directData = await fetchShopStatusDirectFromSupabase();
  if (directData) return directData;

  // 3. Fallback default
  return getDefaultShopStatus();
}

/**
 * Update Shop Status and Closure Banner settings
 */
export async function updateShopStatus(statusData) {
  // Prepare data with calculated real dates
  const current = (await fetchShopStatus()) || getDefaultShopStatus();
  const merged = {
    ...current,
    ...statusData,
    updatedAt: new Date().toISOString(),
  };

  if (merged.reopenDate) {
    merged.reopenDateFormatted = formatIndianDate(merged.reopenDate);
  } else if (merged.closureDays) {
    const calculated = calculateReopenDate(merged.closureDays, merged.startDate || new Date());
    merged.reopenDate = calculated.reopenDate;
    merged.reopenDateFormatted = calculated.reopenDateFormatted;
  }

  // 1. Direct Supabase save (primary, real-time push to website)
  const supabaseSuccess = await saveShopStatusDirectToSupabase(merged);

  // 2. Also notify backend API if available
  const candidateUrls = getCandidateBaseUrls();
  for (const baseUrl of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch(`${baseUrl}/api/shop-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (e) {}
  }

  return { success: true, shopStatus: merged };
}
