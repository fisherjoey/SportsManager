/**
 * Clear Access Control Cache
 *
 * This script clears all cached access control data to ensure
 * permission changes take effect immediately
 */

const CacheService = require('../src/services/CacheService').default;

async function clearAccessCache() {
  console.log('Clearing access control cache...');

  try {
    // Clear all role access related cache entries
    const patterns = [
      'role_access:*',
      'permissions:*',
      'user_permissions:*',
      'role_permissions:*'
    ];

    for (const pattern of patterns) {
      console.log(`Clearing cache pattern: ${pattern}`);
      // CacheService might use Redis or in-memory cache
      // We'll attempt to clear both

      // If using Redis
      if (CacheService.client && CacheService.client.keys) {
        const keys = await CacheService.client.keys(pattern);
        if (keys && keys.length > 0) {
          await Promise.all(keys.map(key => CacheService.client.del(key)));
          console.log(`  Cleared ${keys.length} Redis keys`);
        }
      }

      // If using in-memory cache
      if (CacheService.cache) {
        const cleared = CacheService.cache.flushAll ?
          CacheService.cache.flushAll() :
          CacheService.clearPattern ?
            await CacheService.clearPattern(pattern) :
            await CacheService.clear();
        console.log(`  Cleared in-memory cache`);
      }
    }

    // Also try the generic clear method if available
    if (CacheService.clear) {
      await CacheService.clear();
      console.log('Cleared all cache using generic clear method');
    }

    console.log('✅ Successfully cleared access control cache');
    console.log('ℹ️  Users may need to refresh their browser or re-login to see changes');

    process.exit(0);
  } catch (error) {
    console.error('Error clearing cache:', error);
    console.log('⚠️  Cache may not have been fully cleared');
    console.log('ℹ️  Try restarting the backend server to ensure changes take effect');
    process.exit(1);
  }
}

clearAccessCache();