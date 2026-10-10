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
/**
 * Helper to determine if an IP is loopback or emulator alias that cannot reach host port 5000
 */
function isExcludedIp(ip) {
  if (!ip || typeof ip !== 'string') return true;
  const clean = ip.trim();
  return ['localhost', '127.0.0.1', '10.0.2.2', '0.0.0.0'].includes(clean);
}

/**
 * Dynamically extract host IP of the developer's computer.
 * Works across iOS Simulator, iOS physical device (Expo Go), Android Emulator, and physical phones.
 */
export function getDevHostIp() {
  // 1. Check explicit EXPO_PUBLIC_LOCAL_IP environment variable
  if (process.env.EXPO_PUBLIC_LOCAL_IP && typeof process.env.EXPO_PUBLIC_LOCAL_IP === 'string') {
    const rawIp = process.env.EXPO_PUBLIC_LOCAL_IP.trim();
    if (!isExcludedIp(rawIp)) {
      return rawIp;
    }
  }

  // 2. Check React Native NativeModules.SourceCode.scriptURL (Most accurate across all Expo/RN versions)
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL && typeof scriptURL === 'string') {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && !isExcludedIp(match[1])) {
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
      if (ip && !isExcludedIp(ip)) {
        return ip;
      }
    }
  } catch (e) {}

  // 4. Check deep linking URI or experienceUrl
  try {
    const uri = Constants.linkingUri || Constants.experienceUrl;
    if (uri && typeof uri === 'string') {
      const match = uri.match(/:\/\/([^:/]+)/);
      if (match && match[1] && !isExcludedIp(match[1])) {
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
  // 1. Explicit environment variable override ALWAYS takes highest priority (unless 10.0.2.2)
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '' && !envUrl.includes('10.0.2.2')) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Production release builds (EAS build, standalone APK/bundle, deployed web)
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    return PRODUCTION_API_URL;
  }

  // 3. Web browser running on developer machine
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      return PRODUCTION_API_URL;
    }
    return `http://localhost:${LOCAL_PORT}`;
  }

  // 4. For mobile devices (Android & iOS - both physical devices & emulators):
  // Prioritize active LAN IP of developer machine so real devices and emulators connect reliably
  const hostIp = getDevHostIp();
  if (hostIp && !isExcludedIp(hostIp)) {
    return `http://${hostIp}:${LOCAL_PORT}`;
  }

  if (CURRENT_LOCAL_IP) {
    return `http://${CURRENT_LOCAL_IP}:${LOCAL_PORT}`;
  }

  return `http://localhost:${LOCAL_PORT}`;
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
 * Compute stock status according to business rules:
 * - Stock <= 0 or inStock === false -> 'Out of Stock'
 * - Stock === 1 -> 'Low Stock'
 * - Stock >= 2 -> 'In Stock'
 */
export function computeStockStatus(stockQuantity, inStock = true) {
  const stock = Number(stockQuantity ?? 0);
  if (stock <= 0 || inStock === false) {
    return 'Out of Stock';
  }
  if (stock === 1) {
    return 'Low Stock';
  }
  return 'In Stock';
}

/**
 * Helper to get all candidate backend base URLs (current, local, LAN)
 * Prioritizes host Mac LAN IP (10.53.190.144:5000) so real devices and emulators connect reliably
 */
export function getCandidateBaseUrls() {
  const urls = [];
  
  // 1. Direct machine LAN IP (Tested working across physical devices & emulators)
  if (CURRENT_LOCAL_IP) {
    const lanUrl = `http://${CURRENT_LOCAL_IP}:${LOCAL_PORT}`;
    if (!urls.includes(lanUrl)) urls.push(lanUrl);
  }

  // 2. Active configured API_BASE_URL if not an emulator alias
  if (API_BASE_URL && !API_BASE_URL.includes('10.0.2.2')) {
    if (!urls.includes(API_BASE_URL)) urls.push(API_BASE_URL);
  }

  // 3. Dynamically detected host IP
  const hostIp = getDevHostIp();
  if (hostIp && !isExcludedIp(hostIp)) {
    const detectedLan = `http://${hostIp}:${LOCAL_PORT}`;
    if (!urls.includes(detectedLan)) urls.push(detectedLan);
  }

  // 4. Localhost for Web / iOS Simulator
  if (Platform.OS === 'web' || Platform.OS === 'ios') {
    if (!urls.includes(`http://localhost:${LOCAL_PORT}`)) urls.push(`http://localhost:${LOCAL_PORT}`);
  }

  // 5. Remote Production Render Backend
  if (!urls.includes(PRODUCTION_API_URL)) urls.push(PRODUCTION_API_URL);

  // 6. Last resort fallback for Android emulator (only if adb port forwarding is active)
  if (Platform.OS === 'android') {
    const emuUrl = `http://10.0.2.2:${LOCAL_PORT}`;
    if (!urls.includes(emuUrl)) urls.push(emuUrl);
  }

  return urls;
}

/**
 * Fetch all products from backend with multi-candidate network retry and direct Supabase fallback
 */
export async function fetchProducts() {
  const candidateUrls = getCandidateBaseUrls();

  // 1. Try candidate backend endpoints
  for (const baseUrl of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${baseUrl}/api/products`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          return data.products.map((p) => ({
            ...p,
            stockStatus: p.stockStatus || computeStockStatus(p.stockQuantity, p.inStock),
          }));
        }
      }
    } catch (e) {
      // Continue to next candidate URL
    }
  }

  // 2. Direct Supabase REST Fallback (ensures app works even when Express server is unreachable)
  try {
    const supabaseUrl = `${SUPABASE_REST_URL}/rest/v1/products?select=*&order=created_at.desc`;
    const res = await fetch(supabaseUrl, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (res.ok) {
      const dbProducts = await res.json();
      if (Array.isArray(dbProducts)) {
        return dbProducts.map((row) => {
          const stock = Number(row.stock_quantity ?? 50);
          const isInStock = stock > 0 && row.in_stock !== false;
          const rawImages = row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : [];
          const rawImage = row.image_src || '';
          return {
            id: row.id,
            name: row.name,
            category: row.category || 'General',
            school: row.school || '',
            applicableClass: row.applicable_class || 'All Classes',
            description: row.description || '',
            details: row.description || '',
            basePrice: Number(row.base_price || 500),
            imageSrc: rawImage,
            images: (Array.isArray(rawImages) && rawImages.length > 0 ? rawImages : [rawImage]),
            sizes: row.sizes ? (typeof row.sizes === 'string' ? JSON.parse(row.sizes) : row.sizes) : ['28', '30', '32', '34', '36'],
            sizesText: row.sizes_text || 'Multiple Sizes',
            sizePrices: row.size_prices ? (typeof row.size_prices === 'string' ? JSON.parse(row.size_prices) : row.size_prices) : {},
            sizeStocks: row.size_stocks ? (typeof row.size_stocks === 'string' ? JSON.parse(row.size_stocks) : row.size_stocks) : {},
            inStock: isInStock,
            stockQuantity: stock,
            stockStatus: computeStockStatus(stock, isInStock),
            createdAt: row.created_at,
          };
        });
      }
    }
  } catch (supabaseErr) {
    console.warn('Direct Supabase products fetch notice:', supabaseErr.message);
  }

  return [];
}

/**
 * Fetch all orders with optional status and search filter with multi-candidate network retry and Supabase fallback
 */
export async function fetchOrders(status = 'All', search = '') {
  const candidateUrls = getCandidateBaseUrls();
  const params = new URLSearchParams();
  if (status && status !== 'All') params.append('status', status);
  if (search) params.append('search', search);
  const queryString = params.toString() ? `?${params.toString()}` : '';

  // 1. Try candidate backend endpoints
  for (const baseUrl of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${baseUrl}/api/orders${queryString}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          return data.orders;
        }
      }
    } catch (e) {
      // Continue to next candidate URL
    }
  }

  // 2. Direct Supabase REST Fallback
  try {
    let supabaseUrl = `${SUPABASE_REST_URL}/rest/v1/orders?select=*&order=created_at.desc`;
    if (status && status !== 'All') {
      supabaseUrl += `&status=eq.${encodeURIComponent(status)}`;
    }
    const res = await fetch(supabaseUrl, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (res.ok) {
      const dbOrders = await res.json();
      if (Array.isArray(dbOrders)) {
        let orders = dbOrders.map((row) => ({
          id: row.id,
          orderId: row.id,
          orderNumber: row.order_number || row.id,
          customerName: row.customer_name || 'Customer',
          customerPhone: row.customer_phone || '',
          customerAddress: row.customer_address || '',
          city: row.city || 'Bathinda',
          pinCode: row.pincode || row.pin_code || '151001',
          school: row.school || '',
          status: row.status || 'Pending',
          items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
          totalAmount: Number(row.total_amount || 0),
          totalItems: Number(row.total_items || 0),
          deliveryTime: row.delivery_time || '',
          declineReason: row.decline_reason || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        if (search) {
          const q = search.toLowerCase();
          orders = orders.filter((o) =>
            (o.customerName && o.customerName.toLowerCase().includes(q)) ||
            (o.id && o.id.toLowerCase().includes(q)) ||
            (o.customerPhone && o.customerPhone.includes(q))
          );
        }

        return orders;
      }
    }
  } catch (supabaseErr) {
    console.warn('Direct Supabase orders fetch notice:', supabaseErr.message);
  }

  return [];
}

/**
 * Fetch single order by ID
 */
export async function fetchOrderById(id) {
  const candidateUrls = getCandidateBaseUrls();

  for (const baseUrl of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${baseUrl}/api/orders/${encodeURIComponent(id)}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.order) {
          return data.order;
        }
      }
    } catch (e) {}
  }

  // Direct Supabase REST fallback
  try {
    const res = await fetch(`${SUPABASE_REST_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}&select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const row = data[0];
        return {
          id: row.id,
          orderId: row.id,
          orderNumber: row.order_number || row.id,
          customerName: row.customer_name || 'Customer',
          customerPhone: row.customer_phone || '',
          customerAddress: row.customer_address || '',
          city: row.city || 'Bathinda',
          pinCode: row.pincode || row.pin_code || '151001',
          school: row.school || '',
          status: row.status || 'Pending',
          items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
          totalAmount: Number(row.total_amount || 0),
          totalItems: Number(row.total_items || 0),
          deliveryTime: row.delivery_time || '',
          declineReason: row.decline_reason || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Update order status (Accept with Delivery Time or Decline with Reason)
 */
export async function updateOrderStatus(id, statusPayload) {
  const candidateUrls = getCandidateBaseUrls();
  let lastError = null;

  for (const baseUrl of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${baseUrl}/api/orders/${encodeURIComponent(id)}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(statusPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return data.order;
      }
    } catch (error) {
      lastError = error;
    }
  }

  // Direct Supabase REST fallback
  try {
    const updateBody = {
      status: statusPayload.status,
      updated_at: new Date().toISOString(),
    };
    if (statusPayload.deliveryTime) updateBody.delivery_time = statusPayload.deliveryTime;
    if (statusPayload.declineReason) updateBody.decline_reason = statusPayload.declineReason;

    const res = await fetch(`${SUPABASE_REST_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(updateBody),
    });

    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data[0] : { id, ...statusPayload };
    }
  } catch (e) {}

  throw lastError || new Error(`Failed to update order status for ${id}`);
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
    deliveryOrdersClosed: false,
    closureDays: 2,
    startDate: now.toISOString(),
    reopenDate: reopen.toISOString(),
    reopenDateFormatted: formatted,
    bannerTitle: 'Shop Temporarily Closed for 2 Days',
    bannerMessage: `We are currently not processing any online orders, Please revisit our website after a few business days.`,
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
