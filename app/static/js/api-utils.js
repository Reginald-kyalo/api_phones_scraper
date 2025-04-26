/**
 * API utilities for centralized URL configuration and fetch calls
 */

// Base URL configuration - use relative URLs in development for flexibility
export const API_BASE_URL = "/api"; 

  /**
   * Check if the user is authenticated by verifying session
   * @returns {Promise<boolean>} - Authentication status
   */
export async function checkAuthenticated() {
  try {
    const response = await secureApiCall("verify-session");
    return response.ok;
  } catch (error) {
    console.error("Session verification failed:", error);
    return false;
  }
}

/**
 * Makes an API call with proper configuration
 * @param {string} endpoint - API endpoint (without /api prefix)
 * @param {Object} options - Fetch options
 * @returns {Promise} - Fetch promise
 */
export async function apiCall(endpoint, options = {}) {
  // Ensure endpoint starts with a slash
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Use the base URL
  const url = `${API_BASE_URL}${path}`;
  
  return fetch(url, options);
}

/**
 * Makes an authenticated API call with credentials included
 * @param {string} endpoint - API endpoint (without /api prefix)
 * @param {Object} options - Fetch options
 * @returns {Promise} - Fetch promise
 */
export async function secureApiCall(endpoint, options = {}) {
  try {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${path}`;
    
    const secureOptions = {
      ...options,
      credentials: 'include',
      headers: {
        ...options.headers,
        'Content-Type': options.headers?.['Content-Type'] || 'application/json',
      }
    };
    
    const response = await fetch(url, secureOptions);
    
    // Add custom json() method that won't fail on empty responses
    response.safeJson = async () => {
      try {
        const text = await response.text();
        return text ? JSON.parse(text) : {};
      } catch (err) {
        console.warn(`Failed to parse JSON for ${url}:`, err);
        return {};
      }
    };
    
    return response;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Makes an API call with retry logic and error handling
 * @param {string} endpoint - API endpoint (without /api prefix)
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise} - Fetch promise
 */
export async function apiCallWithRetry(endpoint, options = {}, maxRetries = 3) {
  let retries = 0;
  
  while (retries <= maxRetries) {
    try {
      const response = await secureApiCall(endpoint, options);
      return response;
    } catch (err) {
      retries++;
      if (retries > maxRetries) throw err;
      
      // Exponential backoff
      const delay = Math.min(1000 * 2 ** retries, 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Handles common API response patterns
 * @param {Response} response - Fetch response object
 * @param {Function} onSuccess - Success handler
 * @param {Function} onError - Error handler
 */
export async function handleApiResponse(response, onSuccess, onError) {
  try {
    const data = await response.json();
    
    if (response.ok) {
      if (onSuccess) onSuccess(data);
      return data;
    } else {
      if (onError) onError(data.detail || 'An error occurred');
      return null;
    }
  } catch (error) {
    if (onError) onError('Failed to process response');
    console.error('API response error:', error);
    return null;
  }
}