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
  maxDistance: number
  isAvailable: boolean
}

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
    maxDistance: 25,
    isAvailable: true,
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
    maxDistance: 30,
    isAvailable: true,
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
    maxDistance: 20,
    isAvailable: false,
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
    maxDistance: 35,
    isAvailable: true,
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
    maxDistance: 40,
    isAvailable: true,
  },
]
