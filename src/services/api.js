import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Dynamically resolve backend API base URL
 * Handles Expo Go physical devices, Android emulator, iOS simulator, & Web
 */
const PRODUCTION_API_URL = 'https://admin-app-backend-i5tk.onrender.com';
const SUPABASE_REST_URL = 'https://rxnvxqrzgecynpxjobkh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XPwu7-Cx7wQHzSOAeuB2rA_JSvjvTCd';

/**
 * Dynamically resolve backend API base URL
 * 1. Checks EXPO_PUBLIC_API_URL / EXPO_PUBLIC_BACKEND_URL (from .env or build env)
 * 2. In __DEV__, prioritizes local backend server (port 5000) over remote Render
 * 3. Checks Constants.expoConfig?.extra?.apiUrl (from app.json)
 * 4. Falls back to production Render backend if in release/production build
 * 5. Resolves local backend (port 5000) for local development (Expo Go, Emulator, Web)
 */
const getApiBaseUrl = () => {
  // 1. Explicit environment variable (Expo SDK 49+ support EXPO_PUBLIC_*)
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    // If in development mode and envUrl points to remote Render, prioritize local dev machine on port 5000
    if (typeof __DEV__ !== 'undefined' && __DEV__ && envUrl.includes('onrender.com')) {
      if (Platform.OS === 'web') {
        return 'http://localhost:5000';
      }
      try {
        const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
        if (hostUri) {
          const ip = hostUri.split(':')[0];
          if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
            return `http://${ip}:5000`;
          }
        }
      } catch (e) {}
      if (Platform.OS === 'android') {
        return 'http://10.0.2.2:5000';
      }
    }
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Expo config extra field (from app.json)
  const extraUrl = Constants.expoConfig?.extra?.apiUrl;
  if (extraUrl && typeof extraUrl === 'string' && extraUrl.trim() !== '') {
    return extraUrl.trim().replace(/\/+$/, '');
  }

  // 3. Production release builds (EAS build, standalone APK/bundle, deployed web)
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    return PRODUCTION_API_URL;
  }

  // 4. Local development fallbacks (__DEV__ === true)
  if (Platform.OS === 'web') {
    // Check if running on a remote web domain or local
    if (typeof window !== 'undefined' && window.location?.hostname && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      return PRODUCTION_API_URL;
    }
    return 'http://localhost:5000';
  }

  // Expo Go / physical device resolving local dev machine IP on backend port 5000
  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:5000`;
      }
    }
  } catch (err) {
    console.warn('Could not resolve Expo host IP, falling back:', err.message);
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  return PRODUCTION_API_URL;
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

  // Local candidate URLs
  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        const lanUrl = `http://${ip}:5000`;
        if (!urls.includes(lanUrl)) urls.push(lanUrl);
      }
    }
  } catch (e) {}

  if (Platform.OS === 'web') {
    if (!urls.includes('http://localhost:5000')) urls.push('http://localhost:5000');
  }
  if (Platform.OS === 'android') {
    if (!urls.includes('http://10.0.2.2:5000')) urls.push('http://10.0.2.2:5000');
  }

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
 * Fetch categories dynamically from backend
 */
export async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/categories`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        return data.categories;
      }
    }
  } catch (e) {
    console.warn('Could not fetch categories from server:', e.message);
  }
  return null;
}

/**
 * Save new category to backend
 */
export async function createCategory(category) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Could not persist category to server:', e.message);
  }
}

/**
 * Update / Rename an existing category
 */
export async function updateCategory(oldName, newName) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/categories/${encodeURIComponent(oldName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName }),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update category');
  } catch (e) {
    console.warn('Could not update category on server:', e.message);
    throw e;
  }
}

/**
 * Delete a category from backend
 */
export async function deleteCategory(categoryName) {
  try {
    const cleanName = String(categoryName).trim();
    const res = await fetch(`${API_BASE_URL}/api/categories/${encodeURIComponent(cleanName)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ category: cleanName }),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete category');
  } catch (e) {
    console.warn('Could not delete category on server:', e.message);
    throw e;
  }
}

/**
 * Fetch schools dynamically from backend
 */
export async function fetchSchools() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/schools`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.schools)) {
        return data.schools;
      }
    }
  } catch (e) {
    console.warn('Could not fetch schools from server:', e.message);
  }
  return null;
}

/**
 * Save new school to backend
 */
export async function createSchool(school) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/schools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ school }),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create school');
  } catch (e) {
    console.warn('Could not persist school to server:', e.message);
    throw e;
  }
}

/**
 * Update / Rename an existing school
 */
export async function updateSchool(oldName, newName) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/schools/${encodeURIComponent(oldName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName }),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update school');
  } catch (e) {
    console.warn('Could not update school on server:', e.message);
    throw e;
  }
}

/**
 * Delete a school from backend
 */
export async function deleteSchool(schoolName) {
  try {
    const cleanName = String(schoolName).trim();
    const res = await fetch(`${API_BASE_URL}/api/schools/${encodeURIComponent(cleanName)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ school: cleanName }),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete school');
  } catch (e) {
    console.warn('Could not delete school on server:', e.message);
    throw e;
  }
}

/**
 * Fetch classes dynamically from backend
 */
export async function fetchClasses() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/classes`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.classes)) {
        return data.classes;
      }
    }
  } catch (e) {
    console.warn('Could not fetch classes from server:', e.message);
  }
  return null;
}

/**
 * Save new class to backend
 */
export async function createClass(className) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ className }),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create class');
  } catch (e) {
    console.warn('Could not persist class to server:', e.message);
    throw e;
  }
}

/**
 * Update / Rename an existing class
 */
export async function updateClass(oldName, newName) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/classes/${encodeURIComponent(oldName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName }),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update class');
  } catch (e) {
    console.warn('Could not update class on server:', e.message);
    throw e;
  }
}

/**
 * Delete a class from backend
 */
export async function deleteClass(className) {
  try {
    const cleanName = String(className).trim();
    const res = await fetch(`${API_BASE_URL}/api/classes/${encodeURIComponent(cleanName)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ className: cleanName }),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete class');
  } catch (e) {
    console.warn('Could not delete class on server:', e.message);
    throw e;
  }
}



