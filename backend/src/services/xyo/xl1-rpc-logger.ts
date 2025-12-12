/**
 * XL1 RPC Request/Response Logger
 * Intercepts and logs all XL1 RPC HTTP requests/responses with pretty-printed JSON
 * Handles both axios and fetch-based HTTP clients
 */

import axios from 'axios';
import { env } from '../../lib/env.js';

let interceptorInstalled = false;
let fetchInterceptorInstalled = false;

/**
 * Install axios interceptor to log all XL1 RPC requests/responses
 * This intercepts HTTP calls made by the SDK's HttpRpcXyoConnection
 */
export function installXl1RpcLogger(): void {
  if (interceptorInstalled) {
    return;
  }

  const rpcUrl = env.xyoChainRpcUrl;
  if (!rpcUrl) {
     
    console.warn('XL1 RPC URL not configured, cannot install logger');
    return;
  }

  // Normalize RPC URL for matching (remove trailing slashes, ensure /rpc suffix)
  const normalizedRpcUrl = rpcUrl.replace(/\/+$/, '').replace(/\/rpc$/, '');
  
  // Request interceptor
  axios.interceptors.request.use(
    (config) => {
      // Check if this request is going to the XL1 RPC endpoint
      const requestUrl = config.url || '';
      const baseURL = config.baseURL || '';
      const fullUrl = requestUrl.startsWith('http') ? requestUrl : `${baseURL}${requestUrl}`;
      
      if (fullUrl.includes(normalizedRpcUrl) || fullUrl.includes('/rpc')) {
         
        console.log('\n=== XL1 RPC REQUEST ===');
         
        console.log('Method:', config.method?.toUpperCase() || 'UNKNOWN');
         
        console.log('URL:', fullUrl);
        
        if (config.headers) {
           
          console.log('Headers:', JSON.stringify(config.headers, null, 2));
        }
        
        if (config.data) {
          try {
            // Try to parse and pretty print JSON
            const data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
             
            console.log('Request Body:', JSON.stringify(data, null, 2));
          } catch {
            // If not JSON, log as-is
             
            console.log('Request Body:', config.data);
          }
        }
        
         
        console.log('========================\n');
      }
      
      return config;
    },
    (error) => {
       
      console.error('=== XL1 RPC REQUEST ERROR ===');
       
      console.error('Error:', JSON.stringify(error, null, 2));
      return Promise.reject(error);
    }
  );

  // Response interceptor
  axios.interceptors.response.use(
    (response) => {
      const requestUrl = response.config.url || '';
      const baseURL = response.config.baseURL || '';
      const fullUrl = requestUrl.startsWith('http') ? requestUrl : `${baseURL}${requestUrl}`;
      
      if (fullUrl.includes(normalizedRpcUrl) || fullUrl.includes('/rpc')) {
         
        console.log('\n=== XL1 RPC RESPONSE ===');
         
        console.log('Status:', response.status, response.statusText);
         
        console.log('URL:', fullUrl);
        
        if (response.headers) {
           
          console.log('Headers:', JSON.stringify(response.headers, null, 2));
        }
        
        if (response.data) {
          try {
            // Pretty print JSON response
             
            console.log('Response Body:', JSON.stringify(response.data, null, 2));
          } catch {
             
            console.log('Response Body:', response.data);
          }
        }
        
         
        console.log('========================\n');
      }
      
      return response;
    },
    (error) => {
      const requestUrl = error.config?.url || '';
      const baseURL = error.config?.baseURL || '';
      const fullUrl = requestUrl.startsWith('http') ? requestUrl : `${baseURL}${requestUrl}`;
      
      if (fullUrl.includes(normalizedRpcUrl) || fullUrl.includes('/rpc')) {
         
        console.error('\n=== XL1 RPC RESPONSE ERROR ===');
         
        console.error('Status:', error.response?.status || 'NO RESPONSE');
         
        console.error('URL:', fullUrl);
        
        if (error.response?.data) {
          try {
             
            console.error('Error Response Body:', JSON.stringify(error.response.data, null, 2));
          } catch {
             
            console.error('Error Response Body:', error.response.data);
          }
        }
        
        if (error.message) {
           
          console.error('Error Message:', error.message);
        }
        
         
        console.error('========================\n');
      }
      
      return Promise.reject(error);
    }
  );

  interceptorInstalled = true;
   
  console.log('XL1 RPC axios logger installed - all axios requests/responses will be logged');
}

/**
 * Install global fetch interceptor to log all XL1 RPC requests/responses
 * This catches requests made by SDKs that use fetch instead of axios
 */
export function installFetchInterceptor(): void {
  if (fetchInterceptorInstalled) {
    return;
  }

  const rpcUrl = env.xyoChainRpcUrl;
  if (!rpcUrl) {
     
    console.warn('XL1 RPC URL not configured, cannot install fetch logger');
    return;
  }

  // Normalize RPC URL for matching
  const normalizedRpcUrl = rpcUrl.replace(/\/+$/, '').replace(/\/rpc$/, '');
  
  // Store original fetch
  const originalFetch = globalThis.fetch;

  // Override global fetch
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit & { baseURL?: string }): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const fullUrl = url.startsWith('http') ? url : (init?.baseURL ? `${init.baseURL}${url}` : url);
    
    // Check if this is an XL1 RPC request
    const isXl1RpcRequest = fullUrl.includes(normalizedRpcUrl) || fullUrl.includes('/rpc');
    
    if (isXl1RpcRequest) {
       
      console.log('\n=== XL1 RPC REQUEST (fetch) ===');
       
      console.log('Method:', init?.method || 'GET');
       
      console.log('URL:', fullUrl);
      
      if (init?.headers) {
         
        console.log('Headers:', JSON.stringify(init.headers, null, 2));
      }
      
      if (init?.body) {
        try {
          const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
           
          console.log('Request Body:', JSON.stringify(body, null, 2));
        } catch {
           
          console.log('Request Body:', init.body);
        }
      }
      
       
      console.log('========================\n');
      
      try {
        const response = await originalFetch(input, init);
        
        // Clone response so we can read body without consuming it
        const clonedResponse = response.clone();
        
         
        console.log('\n=== XL1 RPC RESPONSE (fetch) ===');
         
        console.log('Status:', response.status, response.statusText);
         
        console.log('URL:', fullUrl);
        
        if (response.headers) {
          const headersObj: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headersObj[key] = value;
          });
           
          console.log('Headers:', JSON.stringify(headersObj, null, 2));
        }
        
        // Try to read response body as JSON
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const jsonData = await clonedResponse.json();
             
            console.log('Response Body:', JSON.stringify(jsonData, null, 2));
          } else {
            const textData = await clonedResponse.text();
             
            console.log('Response Body:', textData.substring(0, 500)); // Limit to first 500 chars
          }
        } catch (bodyError) {
           
          console.log('Response Body: (could not read)');
        }
        
         
        console.log('========================\n');
        
        return response;
      } catch (error) {
         
        console.error('\n=== XL1 RPC ERROR (fetch) ===');
         
        console.error('URL:', fullUrl);
         
        console.error('Error:', error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
           
          console.error('Stack:', error.stack);
        }
        try {
           
          console.error('Error Details:', JSON.stringify(error, null, 2));
        } catch {
           
          console.error('Error Details:', error);
        }
         
        console.error('========================\n');
        throw error;
      }
    }
    
    // Not an XL1 RPC request, pass through to original fetch
    return originalFetch(input, init);
  };

  fetchInterceptorInstalled = true;
   
  console.log('XL1 RPC fetch logger installed - all fetch requests/responses will be logged');
}

