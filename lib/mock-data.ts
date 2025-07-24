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
  startTime?: string
  endTime?: string
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

export const calgaryVenues = [
  "Bowness Community Centre",
  "Calgary Soccer Centre",
  "Foothills Athletic Park",
  "Genesis Centre",
  "Huntington Hills Community Centre",
  "Prince's Island Park",
  "Ralph Klein Park",
  "Shouldice Athletic Park",
  "South Glenmore Park",
  "Village Square Leisure Centre"
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
    name: 'Saddledome',
    address: '555 Saddledome Rise SE',
    city: 'Calgary',
    postalCode: 'T2G 2W1',
    phone: '403-777-1234',
    capacity: 19289,
    type: 'Arena',
    facilities: ['Parking', 'Concessions', 'Washrooms'],
    notes: 'Home of the Calgary Flames',
    hourlyRate: 150,
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
  },
  {
    id: '2',
    name: 'Rogers Place',
    address: '10220 104 Ave NW',
    city: 'Edmonton',
    postalCode: 'T5J 2S7',
    phone: '780-414-4625',
    capacity: 18347,
    type: 'Arena',
    facilities: ['Parking', 'Concessions', 'Washrooms', 'WiFi'],
    notes: 'Home of the Edmonton Oilers',
    hourlyRate: 200,
    isActive: true,
    createdAt: '2023-01-03T00:00:00Z',
    updatedAt: '2023-01-04T00:00:00Z',
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
    time: "14:00",
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
    time: "11:00",
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
    time: "15:00",
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
    time: "13:00",
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
    time: "16:00",
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
    time: "12:00",
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
    time: "09:00",
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
