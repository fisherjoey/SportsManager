/**
 * Location Data Management Utility
 * 
 * This utility provides functions to manage and initialize the location data system:
 * - Initialize location data for existing users
 * - Migrate existing user postal codes to comprehensive location data
 * - Calculate distances for all user-location pairs
 * - Retry failed calculations
 * - Generate reports on system status
 */

const knex = require('../config/database');
const LocationDataService = require('../services/LocationDataService');
const DistanceCalculationService = require('../services/DistanceCalculationService');

class LocationDataManager {
  constructor() {
    this.locationService = new LocationDataService();
    this.distanceService = new DistanceCalculationService();
  }

  /**
   * Initialize location data for all existing users who don't have it yet
   */
  async initializeUserLocationData() {
    console.log('🚀 Starting user location data initialization...');
    
    try {
      // Get users who need location data
      const usersNeedingLocationData = await this.locationService.getUsersNeedingLocationData();
      
      if (usersNeedingLocationData.length === 0) {
        console.log('✅ All users already have location data!');
        return { success: true, message: 'No users need location data initialization' };
      }

      console.log(`📍 Found ${usersNeedingLocationData.length} users needing location data`);
      
      // Process users in batches to respect API limits
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < usersNeedingLocationData.length; i += batchSize) {
        batches.push(usersNeedingLocationData.slice(i, i + batchSize));
      }
      
      console.log(`📦 Processing ${batches.length} batches of ${batchSize} users each`);
      
      let totalSuccessful = 0;
      let totalFailed = 0;
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`\n⏳ Processing batch ${i + 1}/${batches.length}...`);
        
        const result = await this.locationService.batchCreateUserLocations(batch);
        
        totalSuccessful += result.successful.length;
        totalFailed += result.failed.length;
        
        console.log(`✅ Batch ${i + 1} completed: ${result.successful.length} successful, ${result.failed.length} failed`);
        
        // Wait between batches to respect rate limits
        if (i < batches.length - 1) {
          console.log('⏱️  Waiting 30 seconds before next batch...');
          await this.delay(30000);
        }
      }
      
      console.log(`\n🎉 User location data initialization completed!`);
      console.log(`📊 Summary: ${totalSuccessful} successful, ${totalFailed} failed`);
      
      return {
        success: true,
        totalProcessed: usersNeedingLocationData.length,
        successful: totalSuccessful,
        failed: totalFailed
      };
    } catch (error) {
      console.error('❌ Error during user location data initialization:', error);
      throw error;
    }
  }

  /**
   * Initialize all distance calculations for the entire system
   * WARNING: This can take several hours for large datasets
   */
  async initializeAllDistanceCalculations() {
    console.log('🚀 Starting comprehensive distance calculation initialization...');
    console.log('⚠️  WARNING: This process may take several hours to complete!');
    
    try {
      // Get system stats first
      const stats = await this.getSystemStats();
      console.log('\n📊 System Overview:');
      console.log(`   👥 Users with location data: ${stats.usersWithLocationData}`);
      console.log(`   📍 Active locations: ${stats.activeLocations}`);
      console.log(`   🧮 Total calculations needed: ${stats.totalCalculationsNeeded}`);
      console.log(`   ⏰ Estimated time: ${stats.estimatedTimeHours} hours`);
      
      const proceed = process.env.FORCE_INITIALIZE === 'true' || await this.confirmProceed(
        `This will perform ${stats.totalCalculationsNeeded} distance calculations. Continue?`
      );
      
      if (!proceed) {
        console.log('❌ Initialization cancelled by user');
        return { success: false, message: 'Cancelled by user' };
      }
      
      console.log('\n🏁 Starting full distance calculation initialization...');
      const result = await this.distanceService.initializeAllDistances();
      
      console.log('\n🎉 Distance calculation initialization completed!');
      console.log(`📊 Final Summary:`);
      console.log(`   👥 Users processed: ${result.totalUsers}`);
      console.log(`   📍 Locations processed: ${result.totalLocations}`);
      console.log(`   ✅ Successful calculations: ${result.successfulCalculations}`);
      console.log(`   ❌ Failed calculations: ${result.failedCalculations}`);
      console.log(`   📈 Success rate: ${((result.successfulCalculations / result.totalCalculations) * 100).toFixed(1)}%`);
      
      return result;
    } catch (error) {
      console.error('❌ Error during distance calculation initialization:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive system statistics
   */
  async getSystemStats() {
    try {
      const [
        usersWithLocationData,
        usersTotal,
        activeLocations,
        distanceStats
      ] = await Promise.all([
        knex('user_locations').count('* as count').first(),
        knex('users').where('role', 'referee').count('* as count').first(),
        knex('locations').where('is_active', true).count('* as count').first(),
        this.distanceService.getCalculationStats()
      ]);

      const usersWithLocationCount = parseInt(usersWithLocationData.count);
      const totalUsers = parseInt(usersTotal.count);
      const totalLocations = parseInt(activeLocations.count);
      const totalCalculationsNeeded = usersWithLocationCount * totalLocations;
      const estimatedTimeHours = Math.ceil((totalCalculationsNeeded * 1) / 3600); // 1 second per calculation

      return {
        usersWithLocationData: usersWithLocationCount,
        totalUsers: totalUsers,
        usersNeedingLocationData: totalUsers - usersWithLocationCount,
        activeLocations: totalLocations,
        totalCalculationsNeeded,
        estimatedTimeHours,
        existingCalculations: distanceStats.totalCalculations,
        successfulCalculations: distanceStats.successfulCalculations,
        failedCalculations: distanceStats.failedCalculations,
        calculationsNeeded: Math.max(0, totalCalculationsNeeded - distanceStats.successfulCalculations)
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      throw error;
    }
  }

  /**
   * Print a comprehensive system status report
   */
  async printSystemReport() {
    console.log('\n📋 LOCATION DATA SYSTEM STATUS REPORT');
    console.log('=====================================');
    
    try {
      const stats = await this.getSystemStats();
      
      console.log('\n👥 USER DATA:');
      console.log(`   Total referees: ${stats.totalUsers}`);
      console.log(`   With location data: ${stats.usersWithLocationData}`);
      console.log(`   Missing location data: ${stats.usersNeedingLocationData}`);
      console.log(`   Coverage: ${((stats.usersWithLocationData / stats.totalUsers) * 100).toFixed(1)}%`);
      
      console.log('\n📍 LOCATION DATA:');
      console.log(`   Active locations: ${stats.activeLocations}`);
      
      console.log('\n🧮 DISTANCE CALCULATIONS:');
      console.log(`   Total needed: ${stats.totalCalculationsNeeded}`);
      console.log(`   Completed successfully: ${stats.successfulCalculations}`);
      console.log(`   Failed: ${stats.failedCalculations}`);
      console.log(`   Still needed: ${stats.calculationsNeeded}`);
      console.log(`   Success rate: ${stats.totalCalculations > 0 ? ((stats.successfulCalculations / stats.totalCalculations) * 100).toFixed(1) : 0}%`);
      
      console.log('\n⏰ ESTIMATES:');
      if (stats.calculationsNeeded > 0) {
        console.log(`   Time for remaining calculations: ~${Math.ceil(stats.calculationsNeeded / 3600)} hours`);
        console.log(`   Daily API limit impact: ${Math.ceil(stats.calculationsNeeded / 2000)} days minimum`);
      } else {
        console.log(`   All calculations complete! ✅`);
      }
      
      console.log('\n💡 RECOMMENDATIONS:');
      if (stats.usersNeedingLocationData > 0) {
        console.log(`   🔧 Run user location data initialization for ${stats.usersNeedingLocationData} users`);
      }
      if (stats.calculationsNeeded > 0) {
        console.log(`   🔧 Run distance calculation initialization for ${stats.calculationsNeeded} calculations`);
      }
      if (stats.failedCalculations > 0) {
        console.log(`   🔧 Retry ${stats.failedCalculations} failed calculations`);
      }
      if (stats.usersNeedingLocationData === 0 && stats.calculationsNeeded === 0) {
        console.log(`   🎉 System is fully initialized and up to date!`);
      }
      
      console.log('\n=====================================\n');
      
      return stats;
    } catch (error) {
      console.error('Error generating system report:', error);
      throw error;
    }
  }

  /**
   * Retry all failed distance calculations
   */
  async retryFailedCalculations(maxRetries = 50) {
    console.log(`🔄 Retrying failed distance calculations (max ${maxRetries})...`);
    
    try {
      const result = await this.distanceService.retryFailedCalculations(maxRetries);
      
      console.log(`🎉 Retry completed!`);
      console.log(`   ✅ Successful: ${result.successful.length}`);
      console.log(`   ❌ Still failed: ${result.failed.length}`);
      console.log(`   📊 Total retried: ${result.totalRetried}`);
      
      return result;
    } catch (error) {
      console.error('❌ Error during retry:', error);
      throw error;
    }
  }

  /**
   * Update coordinates for users missing them
   */
  async updateMissingCoordinates() {
    console.log('🔄 Updating missing coordinates for user locations...');
    
    try {
      const usersWithoutCoords = await knex('user_locations')
        .whereNull('latitude')
        .orWhereNull('longitude')
        .select('user_id');
      
      if (usersWithoutCoords.length === 0) {
        console.log('✅ All users already have coordinates!');
        return { success: true, updated: 0 };
      }
      
      console.log(`📍 Found ${usersWithoutCoords.length} users missing coordinates`);
      
      let updated = 0;
      for (const user of usersWithoutCoords) {
        try {
          const result = await this.locationService.updateLocationWithCoordinates(user.user_id);
          if (result && result.latitude && result.longitude) {
            updated++;
          }
          
          // Rate limiting
          await this.delay(500);
        } catch (error) {
          console.error(`Failed to update coordinates for user ${user.user_id}:`, error.message);
        }
      }
      
      console.log(`✅ Updated coordinates for ${updated}/${usersWithoutCoords.length} users`);
      
      return { success: true, updated, total: usersWithoutCoords.length };
    } catch (error) {
      console.error('❌ Error updating missing coordinates:', error);
      throw error;
    }
  }

  /**
   * Simple delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Simple confirmation prompt (for interactive use)
   */
  async confirmProceed(message) {
    // In a real interactive environment, you'd use readline or similar
    // For now, we'll check an environment variable
    return process.env.AUTO_CONFIRM === 'true';
  }
}

// CLI interface for running specific tasks
async function main() {
  const command = process.argv[2];
  const manager = new LocationDataManager();
  
  try {
    switch (command) {
    case 'report':
      await manager.printSystemReport();
      break;
        
    case 'init-users':
      await manager.initializeUserLocationData();
      break;
        
    case 'init-distances':
      await manager.initializeAllDistanceCalculations();
      break;
        
    case 'retry-failed':
      const maxRetries = parseInt(process.argv[3]) || 50;
      await manager.retryFailedCalculations(maxRetries);
      break;
        
    case 'update-coords':
      await manager.updateMissingCoordinates();
      break;
        
    case 'full-init':
      console.log('🚀 Running full system initialization...');
      await manager.initializeUserLocationData();
      await manager.delay(5000);
      await manager.updateMissingCoordinates();
      await manager.delay(5000);
      await manager.initializeAllDistanceCalculations();
      break;
        
    default:
      console.log('Location Data Manager');
      console.log('Usage: node location-data-manager.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  report         - Show system status report');
      console.log('  init-users     - Initialize location data for users');
      console.log('  init-distances - Initialize all distance calculations');
      console.log('  retry-failed   - Retry failed distance calculations');
      console.log('  update-coords  - Update missing coordinates');
      console.log('  full-init      - Run complete system initialization');
      console.log('');
      console.log('Environment variables:');
      console.log('  AUTO_CONFIRM=true     - Skip confirmation prompts');
      console.log('  FORCE_INITIALIZE=true - Force initialization without prompts');
      break;
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  }
  
  console.log('✅ Command completed successfully');
  process.exit(0);
}

// Export the manager class for use in other modules
module.exports = LocationDataManager;

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}