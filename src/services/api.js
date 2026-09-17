import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Dynamically resolve backend API base URL
 * Handles Expo Go physical devices, Android emulator, iOS simulator, & Web
 */
const PRODUCTION_API_URL = 'https://admin-app-backend-i5tk.onrender.com';

/**
 * Dynamically resolve backend API base URL
 * 1. Checks EXPO_PUBLIC_API_URL / EXPO_PUBLIC_BACKEND_URL (from .env or build env)
 * 2. Checks Constants.expoConfig?.extra?.apiUrl (from app.json)
 * 3. Falls back to production Render backend if in release/production build
 * 4. Resolves local backend (port 5000) for local development (Expo Go, Emulator, Web)
 */
const getApiBaseUrl = () => {
  // 1. Explicit environment variable (Expo SDK 49+ support EXPO_PUBLIC_*)
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
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
  } catch (e) {
    console.warn('Could not persist school to server:', e.message);
  }
}


