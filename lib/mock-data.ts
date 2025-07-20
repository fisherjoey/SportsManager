export interface Game {
  id: string
  homeTeam: string
  awayTeam: string
  date: string
  time: string
  location: string
  level: "Recreational" | "Competitive" | "Elite"
  payRate: number
  status: "assigned" | "unassigned" | "up-for-grabs"
  assignedReferees?: string[]
}

export interface Referee {
  id: string
  name: string
  email: string
  phone: string
  level: "Recreational" | "Competitive" | "Elite"
  location: string
  certifications: string[]
  preferredPositions: string[]
  maxDistance: number
  isAvailable: boolean
}

export const mockGames: Game[] = [
  {
    id: "1",
    homeTeam: "Lions FC",
    awayTeam: "Tigers United",
    date: "2024-01-15",
    time: "10:00 AM",
    location: "Central Park Field 1",
    level: "Competitive",
    payRate: 75,
    status: "assigned",
    assignedReferees: ["Mike Johnson"],
  },
  {
    id: "2",
    homeTeam: "Eagles SC",
    awayTeam: "Hawks FC",
    date: "2024-01-16",
    time: "2:00 PM",
    location: "Westside Sports Complex",
    level: "Recreational",
    payRate: 50,
    status: "unassigned",
  },
  {
    id: "3",
    homeTeam: "Wolves FC",
    awayTeam: "Bears United",
    date: "2024-01-17",
    time: "11:00 AM",
    location: "Downtown Stadium",
    level: "Elite",
    payRate: 100,
    status: "up-for-grabs",
  },
  {
    id: "4",
    homeTeam: "Sharks FC",
    awayTeam: "Dolphins SC",
    date: "2024-01-18",
    time: "3:00 PM",
    location: "Eastside Fields",
    level: "Competitive",
    payRate: 75,
    status: "assigned",
    assignedReferees: ["Sarah Davis"],
  },
  {
    id: "5",
    homeTeam: "Panthers FC",
    awayTeam: "Jaguars United",
    date: "2024-01-19",
    time: "1:00 PM",
    location: "Northside Park",
    level: "Recreational",
    payRate: 50,
    status: "up-for-grabs",
  },
  {
    id: "6",
    homeTeam: "Falcons SC",
    awayTeam: "Ravens FC",
    date: "2024-01-20",
    time: "4:00 PM",
    location: "Central Park Field 2",
    level: "Elite",
    payRate: 100,
    status: "unassigned",
  },
  {
    id: "7",
    homeTeam: "Bulls FC",
    awayTeam: "Rams United",
    date: "2024-01-21",
    time: "12:00 PM",
    location: "Westside Sports Complex",
    level: "Competitive",
    payRate: 75,
    status: "assigned",
    assignedReferees: ["Mike Johnson", "Sarah Davis"],
  },
  {
    id: "8",
    homeTeam: "Cardinals SC",
    awayTeam: "Blue Jays FC",
    date: "2024-01-22",
    time: "9:00 AM",
    location: "Downtown Stadium",
    level: "Recreational",
    payRate: 50,
    status: "up-for-grabs",
  },
]

export const mockReferees: Referee[] = [
  {
    id: "2",
    name: "Mike Johnson",
    email: "mike@referee.com",
    phone: "(555) 987-6543",
    level: "Competitive",
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
    location: "Downtown",
    certifications: ["USSF Grade 5", "SafeSport", "Futsal", "Beach Soccer"],
    preferredPositions: ["Center"],
    maxDistance: 40,
    isAvailable: true,
  },
]
