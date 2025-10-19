/**
 * User and Referee Configuration Data
 * Template data for generating realistic test users
 */

// Calgary-specific names (diverse representation)
const firstNames = [
  'James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Ashley',
  'William', 'Amanda', 'John', 'Jennifer', 'Richard', 'Lisa', 'Thomas', 'Karen',
  'Daniel', 'Michelle', 'Matthew', 'Stephanie', 'Christopher', 'Nicole', 'Andrew',
  'Angela', 'Joshua', 'Melissa', 'Ryan', 'Laura', 'Brandon', 'Rebecca', 'Kevin',
  'Elizabeth', 'Steven', 'Rachel', 'Timothy', 'Catherine', 'Mark', 'Samantha',
  'Jason', 'Victoria', 'Brian', 'Lauren', 'Eric', 'Natalie', 'Jeffrey', 'Hannah',
  'Jacob', 'Madison', 'Tyler', 'Olivia', 'Nathan', 'Emma', 'Alexander', 'Sophia',
  'Benjamin', 'Grace', 'Samuel', 'Chloe', 'Nicholas', 'Abigail', 'Dylan', 'Isabella',
  'Ethan', 'Ava', 'Lucas', 'Mia', 'Noah', 'Emily', 'Jack', 'Sofia', 'Owen', 'Lily',
  'Connor', 'Charlotte', 'Liam', 'Ella', 'Mason', 'Zoe', 'Logan', 'Aria', 'Carter',
  'Scarlett', 'Hunter', 'Hazel', 'Caleb', 'Aurora', 'Austin', 'Luna', 'Aiden', 'Nova',
  'Jamal', 'Aaliyah', 'Marcus', 'Amara', 'Darius', 'Zuri', 'DeAndre', 'Nia',
  'Raj', 'Priya', 'Arjun', 'Ananya', 'Vikram', 'Diya', 'Rohan', 'Sana',
  'Chen', 'Mei', 'Wei', 'Lin', 'Jun', 'Ying', 'Li', 'Xiao',
  'Carlos', 'Maria', 'Diego', 'Sofia', 'Miguel', 'Isabella', 'Juan', 'Valentina',
  'Ahmed', 'Fatima', 'Omar', 'Aisha', 'Hassan', 'Zahra', 'Ali', 'Noor',
  'Luca', 'Giulia', 'Marco', 'Francesca', 'Andrea', 'Elena', 'Paolo', 'Chiara',
  'Pierre', 'Sophie', 'Jean', 'Marie', 'Louis', 'Claire', 'Antoine', 'Emma'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
  'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter',
  'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz',
  'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook',
  'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed',
  'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks',
  'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price',
  'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster',
  'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell', 'Sullivan', 'Bell', 'Coleman',
  'Butler', 'Henderson', 'Barnes', 'Gonzales', 'Fisher', 'Vasquez', 'Simmons',
  'Romero', 'Jordan', 'Patterson', 'Reynolds', 'Hamilton', 'Graham', 'Kim', 'Chen',
  'Singh', 'Kumar', 'Ali', 'Wang', 'Zhang', 'Liu', 'Mohammed', 'Hassan'
];

// Calgary neighborhoods for diverse location assignment
const calgaryNeighborhoods = [
  // Northwest
  { name: 'Arbour Lake', quadrant: 'NW', latitude: 51.1320, longitude: -114.1820 },
  { name: 'Scenic Acres', quadrant: 'NW', latitude: 51.1243, longitude: -114.2156 },
  { name: 'Tuscany', quadrant: 'NW', latitude: 51.1289, longitude: -114.2265 },
  { name: 'Royal Oak', quadrant: 'NW', latitude: 51.1523, longitude: -114.1156 },
  { name: 'Kincora', quadrant: 'NW', latitude: 51.1689, longitude: -114.0856 },
  { name: 'Beddington Heights', quadrant: 'NW', latitude: 51.1045, longitude: -114.1089 },
  { name: 'Huntington Hills', quadrant: 'NW', latitude: 51.1089, longitude: -114.1123 },
  { name: 'Dalhousie', quadrant: 'NW', latitude: 51.0934, longitude: -114.1345 },
  { name: 'Varsity', quadrant: 'NW', latitude: 51.0845, longitude: -114.1456 },
  { name: 'Montgomery', quadrant: 'NW', latitude: 51.0623, longitude: -114.1267 },

  // Northeast
  { name: 'Panorama Hills', quadrant: 'NE', latitude: 51.1534, longitude: -114.0934 },
  { name: 'Harvest Hills', quadrant: 'NE', latitude: 51.1445, longitude: -114.0623 },
  { name: 'Country Hills', quadrant: 'NE', latitude: 51.1356, longitude: -114.0423 },
  { name: 'Coventry Hills', quadrant: 'NE', latitude: 51.1267, longitude: -114.0245 },
  { name: 'Saddle Ridge', quadrant: 'NE', latitude: 51.1178, longitude: -113.9534 },
  { name: 'Martindale', quadrant: 'NE', latitude: 51.0934, longitude: -113.9678 },
  { name: 'Taradale', quadrant: 'NE', latitude: 51.0745, longitude: -113.9534 },
  { name: 'Falconridge', quadrant: 'NE', latitude: 51.0956, longitude: -113.9523 },
  { name: 'Temple', quadrant: 'NE', latitude: 51.0823, longitude: -113.9823 },
  { name: 'Marlborough', quadrant: 'NE', latitude: 51.0612, longitude: -113.9734 },

  // Southwest
  { name: 'West Springs', quadrant: 'SW', latitude: 51.0389, longitude: -114.2234 },
  { name: 'Aspen Woods', quadrant: 'SW', latitude: 51.0256, longitude: -114.1989 },
  { name: 'Spruce Cliff', quadrant: 'SW', latitude: 51.0323, longitude: -114.1234 },
  { name: 'Britannia', quadrant: 'SW', latitude: 50.9956, longitude: -114.1434 },
  { name: 'Oakridge', quadrant: 'SW', latitude: 50.9834, longitude: -114.1267 },
  { name: 'Altadore', quadrant: 'SW', latitude: 51.0234, longitude: -114.1056 },
  { name: 'Bankview', quadrant: 'SW', latitude: 51.0356, longitude: -114.1123 },
  { name: 'Lower Mount Royal', quadrant: 'SW', latitude: 51.0423, longitude: -114.0867 },
  { name: 'Beltline', quadrant: 'SW', latitude: 51.0389, longitude: -114.0712 },
  { name: 'Killarney', quadrant: 'SW', latitude: 51.0234, longitude: -114.1234 },

  // Southeast
  { name: 'Auburn Bay', quadrant: 'SE', latitude: 50.8712, longitude: -113.9345 },
  { name: 'Mahogany', quadrant: 'SE', latitude: 50.8534, longitude: -113.9423 },
  { name: 'Cranston', quadrant: 'SE', latitude: 50.8923, longitude: -113.9734 },
  { name: 'Seton', quadrant: 'SE', latitude: 50.8689, longitude: -113.9634 },
  { name: 'McKenzie Towne', quadrant: 'SE', latitude: 50.9123, longitude: -113.9845 },
  { name: 'New Brighton', quadrant: 'SE', latitude: 50.9234, longitude: -113.9567 },
  { name: 'Copperfield', quadrant: 'SE', latitude: 50.9045, longitude: -113.9234 },
  { name: 'Deer Run', quadrant: 'SE', latitude: 50.9267, longitude: -114.0423 },
  { name: 'Acadia', quadrant: 'SE', latitude: 50.9623, longitude: -114.0789 },
  { name: 'Riverbend', quadrant: 'SE', latitude: 50.9356, longitude: -114.0534 }
];

// Certification levels matching database
const certificationLevels = [
  { level: 1, name: 'Level 1', baseRate: 40, experience_min: 0, experience_max: 2 },
  { level: 2, name: 'Level 2', baseRate: 50, experience_min: 1, experience_max: 4 },
  { level: 3, name: 'Level 3', baseRate: 65, experience_min: 3, experience_max: 8 },
  { level: 4, name: 'Level 4', baseRate: 80, experience_min: 5, experience_max: 12 },
  { level: 5, name: 'Level 5', baseRate: 100, experience_min: 8, experience_max: 20 }
];

// Age groups and divisions
const ageGroups = [
  { code: 'U10', name: 'Under 10', minLevel: 1, maxLevel: 3 },
  { code: 'U12', name: 'Under 12', minLevel: 1, maxLevel: 3 },
  { code: 'U14', name: 'Under 14', minLevel: 2, maxLevel: 4 },
  { code: 'U16', name: 'Under 16', minLevel: 2, maxLevel: 4 },
  { code: 'U18', name: 'Under 18', minLevel: 3, maxLevel: 5 },
  { code: 'ADULT', name: 'Adult', minLevel: 3, maxLevel: 5 },
  { code: 'MASTERS', name: 'Masters', minLevel: 2, maxLevel: 5 }
];

// Leagues/Organizations
const leagues = [
  { name: 'Calgary Minor Basketball Association', abbreviation: 'CMBA', type: 'Youth' },
  { name: 'Calgary Adult Basketball League', abbreviation: 'CABL', type: 'Adult' },
  { name: 'Alberta Basketball Association', abbreviation: 'ABA', type: 'Provincial' },
  { name: 'Calgary Elite Basketball', abbreviation: 'CEB', type: 'Competitive' }
];

// Payment methods
const paymentMethods = ['Direct Deposit', 'Cheque', 'E-Transfer'];

// Positions for assignments
const positions = ['Referee 1', 'Referee 2', 'Score Keeper'];

module.exports = {
  firstNames,
  lastNames,
  calgaryNeighborhoods,
  certificationLevels,
  ageGroups,
  leagues,
  paymentMethods,
  positions
};
