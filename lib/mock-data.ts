export interface Team {
  organization: string
  ageGroup: string
  gender: "Boys" | "Girls"
  rank: number
}

export interface Game {
  id: string
  homeTeam: Team
  awayTeam: Team
  date: string
  time?: string
  startTime: string
  endTime: string
  location: string
  postalCode?: string
  level: "Recreational" | "Competitive" | "Elite"
  division: string
  season: string
  payRate: string
  status: "assigned" | "unassigned" | "up-for-grabs"
  refsNeeded: number
  wageMultiplier: string
  wageMultiplierReason?: string
  assignedReferees?: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Referee {
  id: string
  name: string
  email: string
  phone: string
  level: "Recreational" | "Competitive" | "Elite"
  certificationLevel?: string
  location: string
  certifications: string[]
  preferredPositions: string[]
  preferredDivisions: string[]
  maxDistance: number
  isAvailable: boolean
  experience: number
  standardPayRate: number
}

export const calgaryBasketballVenues = [
  "Calgary Basketball Centre",
  "Genesis Place",
  "Bow River Community Centre", 
  "Airdrie Recreation Complex",
  "West Calgary Recreation Centre",
  "North Calgary Basketball Centre",
  "Okotoks Recreation Centre",
  "East Calgary Sports Centre",
  "South Calgary Athletic Centre",
  "Cochrane Recreation Centre",
  "NW Calgary Community Centre",
  "Canada Basketball Academy",
  "Rise Basketball Academy",
  "Skills Elite Academy",
  "Ignite Basketball Centre"
]

export const mockTeams = [
  {
    id: '1',
    name: 'Calgary Flames',
    division: 'U12',
    location: 'Calgary NW',
    contactName: 'John Doe',
    contactEmail: 'john@test.com',
    contactPhone: '403-555-0123',
    homeVenue: 'Saddledome',
    foundedYear: 2020,
    website: 'https://flames.com',
    colors: {
      primary: '#FF0000',
      secondary: '#FFFFFF',
    },
    notes: 'Test team notes',
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
  },
  {
    id: '2',
    name: 'Edmonton Oilers',
    division: 'U14',
    location: 'Edmonton',
    contactName: 'Jane Smith',
    contactEmail: 'jane@test.com',
    contactPhone: '780-555-0124',
    homeVenue: 'Rogers Place',
    foundedYear: 2018,
    website: 'https://oilers.com',
    colors: {
      primary: '#0000FF',
      secondary: '#ORANGE',
    },
    notes: 'Another test team',
    isActive: true,
    createdAt: '2023-01-03T00:00:00Z',
    updatedAt: '2023-01-04T00:00:00Z',
  }
]

export const mockLocations = [
  {
    id: '1',
    name: 'Calgary Basketball Centre',
    address: '1111 Olympic Way SE',
    city: 'Calgary',
    postalCode: 'T2G 3E2',
    phone: '403-777-1234',
    capacity: 2500,
    type: 'Basketball Arena',
    facilities: ['Parking', 'Concessions', 'Washrooms', 'Multiple Courts'],
    notes: 'Premier basketball facility with 4 regulation courts',
    hourlyRate: 180,
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
  },
  {
    id: '2',
    name: 'Genesis Place',
    address: '800 East Chestermere Dr',
    city: 'Chestermere',
    postalCode: 'T1X 1A3',
    phone: '403-207-5900',
    capacity: 1200,
    type: 'Recreation Centre',
    facilities: ['Parking', 'Concessions', 'Washrooms', 'Basketball Courts', 'Pool'],
    notes: 'Multi-sport recreation facility with 2 basketball courts',
    hourlyRate: 120,
    isActive: true,
    createdAt: '2023-01-03T00:00:00Z',
    updatedAt: '2023-01-04T00:00:00Z',
  },
  {
    id: '3',
    name: 'Bow River Community Centre',
    address: '7921 43 Ave NW',
    city: 'Calgary',
    postalCode: 'T3B 1M7',
    phone: '403-288-2489',
    capacity: 800,
    type: 'Community Centre',
    facilities: ['Parking', 'Washrooms', 'Basketball Court', 'Meeting Rooms'],
    notes: 'Community basketball facility serving northwest Calgary',
    hourlyRate: 85,
    isActive: true,
    createdAt: '2023-01-05T00:00:00Z',
    updatedAt: '2023-01-06T00:00:00Z',
  },
  {
    id: '4',
    name: 'Airdrie Recreation Complex',
    address: '145 Jensen Dr',
    city: 'Airdrie',
    postalCode: 'T4B 3J2',
    phone: '403-948-8804',
    capacity: 1000,
    type: 'Recreation Complex',
    facilities: ['Parking', 'Concessions', 'Washrooms', 'Multiple Courts'],
    notes: 'Large recreation complex with 3 basketball courts',
    hourlyRate: 95,
    isActive: true,
    createdAt: '2023-01-07T00:00:00Z',
    updatedAt: '2023-01-08T00:00:00Z',
  },
  {
    id: '5',
    name: 'Okotoks Recreation Centre',
    address: '5 Riverside Dr E',
    city: 'Okotoks',
    postalCode: 'T1S 1A1',
    phone: '403-938-8966',
    capacity: 900,
    type: 'Recreation Centre',
    facilities: ['Parking', 'Concessions', 'Washrooms', 'Basketball Courts'],
    notes: 'Main basketball facility serving Okotoks area',
    hourlyRate: 90,
    isActive: true,
    createdAt: '2023-01-09T00:00:00Z',
    updatedAt: '2023-01-10T00:00:00Z',
  }
]

export const mockGames: Game[] = [
  {
    id: "1",
    homeTeam: {
      organization: "Okotoks",
      ageGroup: "U13",
      gender: "Boys",
      rank: 1
    },
    awayTeam: {
      organization: "Calgary",
      ageGroup: "U13", 
      gender: "Boys",
      rank: 2
    },
    date: "2025-01-15",
    startTime: "10:00",
    endTime: "11:30",
    location: "Central Park Field 1",
    postalCode: "T1S 1A1",
    level: "Competitive",
    division: "U13 Division 1",
    season: "Winter 2025",
    payRate: "75.00",
    status: "assigned",
    refsNeeded: 2,
    wageMultiplier: "1.0",
    assignedReferees: ["Mike Johnson"],
    notes: "",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z"
  },
  {
    id: "2",
    homeTeam: {
      organization: "NW",
      ageGroup: "U11",
      gender: "Girls",
      rank: 1
    },
    awayTeam: {
      organization: "Calgary",
      ageGroup: "U11",
      gender: "Girls", 
      rank: 3
    },
    date: "2025-01-16",
    startTime: "14:00",
    endTime: "15:30",
    location: "Westside Sports Complex",
    postalCode: "T2M 4N3",
    level: "Recreational",
    division: "U11 Division 2",
    season: "Winter 2025",
    payRate: "50.00",
    status: "unassigned",
    refsNeeded: 1,
    wageMultiplier: "1.0",
    notes: "",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-16T00:00:00Z"
  },
  {
    id: "3",
    homeTeam: {
      organization: "Okotoks",
      ageGroup: "U15",
      gender: "Boys",
      rank: 2
    },
    awayTeam: {
      organization: "NW",
      ageGroup: "U15",
      gender: "Boys",
      rank: 1
    },
    date: "2025-01-17",
    startTime: "11:00",
    endTime: "12:30",
    location: "Downtown Stadium",
    postalCode: "T2P 3E7",
    level: "Elite",
    division: "U15 Division 1",
    season: "Winter 2025",
    payRate: "100.00",
    status: "up-for-grabs",
    refsNeeded: 3,
    wageMultiplier: "1.2",
    wageMultiplierReason: "Championship game",
    notes: "",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-17T00:00:00Z"
  },
  {
    id: "4",
    homeTeam: {
      organization: "Calgary",
      ageGroup: "U18",
      gender: "Girls",
      rank: 1
    },
    awayTeam: {
      organization: "Okotoks",
      ageGroup: "U18",
      gender: "Girls",
      rank: 2
    },
    date: "2025-01-18",
    startTime: "15:00",
    endTime: "16:30",
    location: "Eastside Fields",
    postalCode: "T1Y 6A4",
    level: "Competitive",
    division: "U18 Division 1",
    season: "Winter 2025",
    payRate: "75.00",
    status: "assigned",
    refsNeeded: 2,
    wageMultiplier: "1.0",
    assignedReferees: ["Sarah Davis"],
    notes: "",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-18T00:00:00Z"
  },
  {
    id: "5",
    homeTeam: {
      organization: "NW",
      ageGroup: "U13",
      gender: "Girls",
      rank: 3
    },
    awayTeam: {
      organization: "Calgary",
      ageGroup: "U13",
      gender: "Girls",
      rank: 1
    },
    date: "2025-01-19",
    startTime: "13:00",
    endTime: "14:30",
    location: "Northside Park",
    postalCode: "T3K 5V2",
    level: "Recreational",
    division: "U13 Division 3",
    season: "Winter 2025",
    payRate: "50.00",
    status: "up-for-grabs",
    refsNeeded: 1,
    wageMultiplier: "1.0",
    notes: "",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-19T00:00:00Z"
  },
  {
    id: "6",
    homeTeam: {
      organization: "Okotoks",
      ageGroup: "U11",
      gender: "Boys",
      rank: 1
    },
    awayTeam: {
      organization: "NW",
      ageGroup: "U11",
      gender: "Boys",
      rank: 2
    },
    date: "2025-01-20",
    startTime: "16:00",
    endTime: "17:30",
    location: "Central Park Field 2",
    postalCode: "T1S 1A1",
    level: "Elite",
    division: "U11 Division 1",
    season: "Winter 2025",
    payRate: "100.00",
    status: "unassigned",
    refsNeeded: 2,
    wageMultiplier: "1.0",
    notes: "",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-20T00:00:00Z"
  },
  {
    id: "7",
    homeTeam: {
      organization: "Calgary",
      ageGroup: "U15",
      gender: "Girls",
      rank: 2
    },
    awayTeam: {
      organization: "Okotoks",
      ageGroup: "U15",
      gender: "Girls",
      rank: 1
    },
    date: "2025-01-21",
    startTime: "12:00",
    endTime: "13:30",
    location: "Westside Sports Complex",
    postalCode: "T2M 4N3",
    level: "Competitive",
    division: "U15 Division 1",
    season: "Winter 2025",
    payRate: "75.00",
    status: "assigned",
    refsNeeded: 2,
    wageMultiplier: "1.0",
    assignedReferees: ["Mike Johnson", "Sarah Davis"],
    notes: "",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-21T00:00:00Z"
  },
  {
    id: "8",
    homeTeam: {
      organization: "NW",
      ageGroup: "U18",
      gender: "Boys",
      rank: 1
    },
    awayTeam: {
      organization: "Calgary",
      ageGroup: "U18",
      gender: "Boys",
      rank: 3
    },
    date: "2025-01-22",
    startTime: "09:00",
    endTime: "10:30",
    location: "Downtown Stadium",
    postalCode: "T2P 3E7",
    level: "Recreational",
    division: "U18 Division 2",
    season: "Winter 2025",
    payRate: "50.00",
    status: "up-for-grabs",
    refsNeeded: 1,
    wageMultiplier: "0.8",
    wageMultiplierReason: "Training game",
    notes: "",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-22T00:00:00Z"
  },
]

export const mockReferees: Referee[] = [
  {
    id: "2",
    name: "Mike Johnson",
    email: "mike@referee.com",
    phone: "(555) 987-6543",
    level: "Competitive",
    certificationLevel: "USSF Grade 7",
    location: "Downtown",
    certifications: ["USSF Grade 7", "SafeSport"],
    preferredPositions: ["Center", "Assistant"],
    preferredDivisions: ["U13 Division 1", "U15 Division 1"],
    maxDistance: 25,
    isAvailable: true,
    experience: 3,
    standardPayRate: 75,
  },
  {
    id: "3",
    name: "Sarah Davis",
    email: "sarah@referee.com",
    phone: "(555) 456-7890",
    level: "Elite",
    certificationLevel: "USSF Grade 6",
    location: "Westside",
    certifications: ["USSF Grade 6", "SafeSport", "Futsal"],
    preferredPositions: ["Center"],
    preferredDivisions: ["U15 Division 1", "U18 Division 1"],
    maxDistance: 30,
    isAvailable: true,
    experience: 7,
    standardPayRate: 100,
  },
  {
    id: "4",
    name: "Tom Wilson",
    email: "tom@referee.com",
    phone: "(555) 321-0987",
    level: "Recreational",
    certificationLevel: "USSF Grade 8",
    location: "Eastside",
    certifications: ["USSF Grade 8", "SafeSport"],
    preferredPositions: ["Assistant", "4th Official"],
    preferredDivisions: ["U11 Division 2", "U13 Division 3"],
    maxDistance: 20,
    isAvailable: false,
    experience: 2,
    standardPayRate: 50,
  },
  {
    id: "5",
    name: "Lisa Brown",
    email: "lisa@referee.com",
    phone: "(555) 654-3210",
    level: "Competitive",
    certificationLevel: "USSF Grade 7",
    location: "Northside",
    certifications: ["USSF Grade 7", "SafeSport", "Youth Specialist"],
    preferredPositions: ["Center", "Assistant"],
    preferredDivisions: ["U11 Division 1", "U13 Division 1"],
    maxDistance: 35,
    isAvailable: true,
    experience: 5,
    standardPayRate: 75,
  },
  {
    id: "6",
    name: "David Martinez",
    email: "david@referee.com",
    phone: "(555) 789-0123",
    level: "Elite",
    certificationLevel: "USSF Grade 5",
    location: "Downtown",
    certifications: ["USSF Grade 5", "SafeSport", "Futsal", "Beach Soccer"],
    preferredPositions: ["Center"],
    preferredDivisions: ["U15 Division 1", "U18 Division 1"],
    maxDistance: 40,
    isAvailable: true,
    experience: 10,
    standardPayRate: 125,
  },
]

export interface AvailabilitySlot {
  id: string
  refereeId: string
  date: string
  startTime: string
  endTime: string
  isRecurring: boolean
  recurringDays?: number[]
  recurringEndDate?: string
  maxGames?: number
  comments?: string
}

export const mockAvailabilitySlots: AvailabilitySlot[] = [
  {
    id: "1",
    refereeId: "2",
    date: "2025-01-15",
    startTime: "09:00",
    endTime: "18:00",
    isRecurring: true,
    recurringDays: [0, 6], // Sunday and Saturday
    recurringEndDate: "2025-03-31",
    maxGames: 3,
    comments: "Available weekends",
  },
  {
    id: "2",
    refereeId: "3",
    date: "2025-01-15",
    startTime: "08:00",
    endTime: "20:00",
    isRecurring: true,
    recurringDays: [0, 6], // Sunday and Saturday
    recurringEndDate: "2025-03-31",
    maxGames: 4,
    comments: "Prefer morning games",
  },
  {
    id: "3",
    refereeId: "5",
    date: "2025-01-15",
    startTime: "10:00",
    endTime: "16:00",
    isRecurring: true,
    recurringDays: [0, 6], // Sunday and Saturday
    recurringEndDate: "2025-03-31",
    maxGames: 2,
    comments: "Northside locations preferred",
  },
  {
    id: "4",
    refereeId: "6",
    date: "2025-01-15",
    startTime: "07:00",
    endTime: "21:00",
    isRecurring: true,
    recurringDays: [0, 6], // Sunday and Saturday
    recurringEndDate: "2025-03-31",
    maxGames: 5,
    comments: "Available all day",
  },
]

export interface GameChunk {
  id: string
  gameIds: string[]
  location: string
  date: string
  startTime: string
  endTime: string
  requiredReferees: number
  assignedTo?: string
}
