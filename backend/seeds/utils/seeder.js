/**
 * Shared Seeding Utilities
 * Common functions used across multiple seed files
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Hash a password for user creation
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Generate a random date within a range
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Date} Random date
 */
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Get a random element from an array
 * @param {Array} arr - Array to pick from
 * @returns {*} Random element
 */
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get multiple random elements from an array
 * @param {Array} arr - Array to pick from
 * @param {number} count - Number of elements to pick
 * @returns {Array} Random elements
 */
function randomElements(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Generate a random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random phone number (Calgary format)
 * @returns {string} Phone number
 */
function generatePhoneNumber() {
  const areaCodes = ['403', '587', '825'];
  const areaCode = randomElement(areaCodes);
  const exchange = randomInt(200, 999);
  const number = randomInt(1000, 9999);
  return `${areaCode}-${exchange}-${number}`;
}

/**
 * Generate Calgary postal code
 * @returns {string} Postal code
 */
function generatePostalCode() {
  const letters = 'ABCEGHJKLMNPRSTVWXYZ';
  const numbers = '0123456789';
  const first = 'T';
  const second = randomInt(1, 3);
  const third = letters[randomInt(0, letters.length - 1)];
  const fourth = randomInt(0, 9);
  const fifth = letters[randomInt(0, letters.length - 1)];
  const sixth = randomInt(0, 9);
  return `${first}${second}${third} ${fourth}${fifth}${sixth}`;
}

/**
 * Truncate tables in dependency order
 * @param {Knex} knex - Knex instance
 * @param {Array<string>} tables - Table names in order
 */
async function truncateTables(knex, tables) {
  await knex.raw('SET session_replication_role = replica;');

  for (const table of tables) {
    try {
      await knex(table).del();
      console.log(`  ✓ Truncated ${table}`);
    } catch (err) {
      console.log(`  ⚠ Could not truncate ${table}: ${err.message}`);
    }
  }

  await knex.raw('SET session_replication_role = DEFAULT;');
}

/**
 * Get or create organization
 * @param {Knex} knex - Knex instance
 * @param {string} name - Organization name
 * @param {string} slug - Organization slug
 * @returns {Promise<Object>} Organization record
 */
async function getOrCreateOrganization(knex, name, slug) {
  let org = await knex('organizations').where({ slug }).first();

  if (!org) {
    [org] = await knex('organizations')
      .insert({
        id: uuidv4(),
        name,
        slug,
        settings: {},
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
  }

  return org;
}

/**
 * Get or create region
 * @param {Knex} knex - Knex instance
 * @param {string} organizationId - Organization ID
 * @param {string} name - Region name
 * @param {string} slug - Region slug
 * @param {string} parentRegionId - Parent region ID (optional)
 * @returns {Promise<Object>} Region record
 */
async function getOrCreateRegion(knex, organizationId, name, slug, parentRegionId = null) {
  let region = await knex('regions')
    .where({ organization_id: organizationId, slug })
    .first();

  if (!region) {
    [region] = await knex('regions')
      .insert({
        id: uuidv4(),
        organization_id: organizationId,
        name,
        slug,
        parent_region_id: parentRegionId,
        settings: {},
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
  }

  return region;
}

/**
 * Weighted random selection
 * @param {Array<{value: *, weight: number}>} options - Options with weights
 * @returns {*} Selected value
 */
function weightedRandom(options) {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let random = Math.random() * totalWeight;

  for (const option of options) {
    random -= option.weight;
    if (random <= 0) {
      return option.value;
    }
  }

  return options[options.length - 1].value;
}

module.exports = {
  hashPassword,
  randomDate,
  calculateDistance,
  randomElement,
  randomElements,
  randomInt,
  generatePhoneNumber,
  generatePostalCode,
  truncateTables,
  getOrCreateOrganization,
  getOrCreateRegion,
  weightedRandom,
};
