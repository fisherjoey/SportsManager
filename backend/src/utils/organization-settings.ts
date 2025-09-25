// @ts-nocheck

import db from '../config/database';

let cachedSettings = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get organization settings with caching
 * @returns {Promise<Object>} Organization settings
 */
async function getOrganizationSettings() {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (cachedSettings && (now - lastFetchTime) < CACHE_DURATION_MS) {
    return cachedSettings;
  }
  
  try {
    const result = await db('organization_settings')
      .select('id', 'organization_name', 'payment_model', 'default_game_rate', 'created_at', 'updated_at')
      .orderBy('created_at', 'desc')
      .limit(1);
    
    let settings;
    if (result.length === 0) {
      // Create default settings if none exist
      const defaultResult = await db('organization_settings')
        .insert({
          organization_name: 'Sports Organization',
          payment_model: 'INDIVIDUAL',
          default_game_rate: null
        })
        .returning(['id', 'organization_name', 'payment_model', 'default_game_rate', 'created_at', 'updated_at']);
      
      settings = defaultResult[0];
    } else {
      settings = result[0];
    }
    
    // Update cache
    cachedSettings = settings;
    lastFetchTime = now;
    
    return settings;
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    
    // Return default settings if database fails
    return {
      id: 'default',
      organization_name: 'Sports Organization',
      payment_model: 'INDIVIDUAL',
      default_game_rate: null,
      created_at: new Date(),
      updated_at: new Date()
    };
  }
}

/**
 * Clear the cached settings (call after updates)
 */
function clearSettingsCache() {
  cachedSettings = null;
  lastFetchTime = 0;
}

export {
  getOrganizationSettings,
  clearSettingsCache
};