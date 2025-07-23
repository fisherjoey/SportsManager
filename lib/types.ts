export interface AvailabilityWindow {
  id: string
  referee_id: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  reason?: string
  created_at?: string
  updated_at?: string
}

export interface AvailabilityResponse {
  success: boolean
  data: {
    refereeId: string
    availability: AvailabilityWindow[]
    count: number
  }
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'referee'
  referee_id?: string
}