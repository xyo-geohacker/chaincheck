import axios from 'axios';
import Constants from 'expo-constants';

function resolveBaseUrl(rawUrl: string | undefined) {
  if (!rawUrl) {
    return undefined;
  }

  try {
    const url = new URL(rawUrl);
    if (!['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
      return rawUrl;
    }

    const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
    if (!hostUri) {
      return rawUrl;
    }

    const resolvedHost = hostUri.split(':')[0];
    url.hostname = resolvedHost;
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;
const baseURL = resolveBaseUrl(rawApiUrl);

if (!baseURL) {
  // eslint-disable-next-line no-console
  console.error('EXPO_PUBLIC_API_URL is not defined. API requests will fail until configured.');
  console.error('Please set EXPO_PUBLIC_API_URL in your .env file');
  console.error('For physical devices, use your computer\'s IP address (e.g., http://192.168.12.191:4000)');
  console.error('For Android emulator, use http://10.0.2.2:4000');
} else {
  // eslint-disable-next-line no-console
  console.log('API Base URL configured:', baseURL);
  // eslint-disable-next-line no-console
  console.log('Raw API URL from env:', rawApiUrl);
  if (rawApiUrl?.includes('10.0.2.2')) {
    // eslint-disable-next-line no-console
    console.warn('⚠️  Using 10.0.2.2 (Android emulator address). If running on a physical device, use your computer\'s IP address instead.');
  }
}

export const apiClient = axios.create({
  baseURL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to log requests
apiClient.interceptors.request.use(
  (config) => {
    // eslint-disable-next-line no-console
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    // eslint-disable-next-line no-console
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors and log responses
apiClient.interceptors.response.use(
  (response) => {
    // eslint-disable-next-line no-console
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    // Check if error logging should be suppressed (e.g., signature upload with fallback)
    const suppressLog = error.config?.headers?.['X-Suppress-Error-Log'] === 'true';
    
    // Log detailed error information (unless suppressed)
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      if (!suppressLog) {
        // eslint-disable-next-line no-console
        console.error('Network Error:', {
          code: error.code,
          message: error.message,
          baseURL: apiClient.defaults.baseURL,
          url: error.config?.url,
          fullError: error.toString()
        });
        // eslint-disable-next-line no-console
        console.error('Troubleshooting: Check that EXPO_PUBLIC_API_URL is set correctly in .env file');
        // eslint-disable-next-line no-console
        console.error('For physical devices, use your computer\'s IP address (e.g., http://192.168.12.191:4000)');
        // eslint-disable-next-line no-console
        console.error('For Android emulator, use http://10.0.2.2:4000');
      }
    } else if (error.response) {
      // Server responded with error status
      if (!suppressLog) {
        // eslint-disable-next-line no-console
        console.error('API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url
        });
      }
    } else {
      // Request was made but no response received
      if (!suppressLog) {
        // eslint-disable-next-line no-console
        console.error('API Error (no response):', {
          message: error.message,
          code: error.code,
          baseURL: apiClient.defaults.baseURL,
          url: error.config?.url,
          fullError: error.toString()
        });
        // eslint-disable-next-line no-console
        console.error('Troubleshooting: Check that backend server is running and accessible');
      }
    }

    if (error.response?.status === 401) {
      // Token is invalid or expired
      // Clear stored credentials - the app should redirect to login
      // eslint-disable-next-line no-console
      console.warn('Authentication failed (401). Token may be expired or invalid.');
      
      // Clear auth header
      setAuthHeader(null);
      
      // Note: Actual logout/redirect should be handled by the component/store
      // that receives this error, as we don't have access to navigation here
    }
    return Promise.reject(error);
  }
);

export function setAuthHeader(token: string | null) {
  if (!token) {
    delete apiClient.defaults.headers.common.Authorization;
    return;
  }

  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
}

