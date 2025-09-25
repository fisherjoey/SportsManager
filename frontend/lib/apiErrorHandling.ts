/**
 * Enhanced API error handling utilities
 * Provides safe API methods that return empty data on failures instead of throwing errors
 */

import { apiClient } from './api'

interface SafeApiResponse<T> {
  data: T
  error: boolean
  status?: number
  message?: string
}

class SafeAPIService {
  private baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

  private async fetchWithErrorHandling(
    url: string,
    options: RequestInit = {}
  ): Promise<SafeApiResponse<any>> {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${this.baseURL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          ...options.headers
        }
      })

      // Return empty data for server errors instead of throwing
      if (response.status >= 500) {
        console.error(`Server error on ${url}:`, response.status)
        return { data: [], error: true, status: response.status }
      }

      if (!response.ok && response.status !== 404) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      return { data, error: false, status: response.status }

    } catch (error) {
      console.error(`API call failed for ${url}:`, error)
      return {
        data: [],
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get referees with safe error handling
   * Returns empty array on error
   */
  async getReferees(filters?: any): Promise<any[]> {
    const params = new URLSearchParams(filters).toString()
    const result = await this.fetchWithErrorHandling(`/users?${params}`)

    // Ensure we always return an array
    if (result.error) {
      return []
    }

    return result.data.users || result.data.data || []
  }

  /**
   * Get mentees for a mentor with safe error handling
   * Returns empty array on error
   */
  async getMentees(userId: string): Promise<any[]> {
    const result = await this.fetchWithErrorHandling(`/mentorships/mentees/${userId}`)

    // Return empty array on error or 404
    if (result.error || result.status === 404) {
      return []
    }

    return Array.isArray(result.data) ? result.data : []
  }

  /**
   * Get communications with safe error handling
   * Returns empty structure on error
   */
  async getCommunications(params?: any): Promise<{
    items: any[]
    total: number
    page: number
    limit: number
  }> {
    const queryString = new URLSearchParams(params).toString()
    const result = await this.fetchWithErrorHandling(`/communications?${queryString}`)

    // Return empty structure on error
    if (result.error) {
      return {
        items: [],
        total: 0,
        page: 1,
        limit: params?.limit || 10
      }
    }

    return result.data
  }

  /**
   * Get users with safe error handling
   * Returns empty array on error
   */
  async getUsers(params?: any): Promise<any[]> {
    const queryString = new URLSearchParams(params).toString()
    const result = await this.fetchWithErrorHandling(`/users?${queryString}`)

    // Ensure we always return an array
    if (result.error) {
      return []
    }

    const users = result.data.users || result.data.data || []
    return Array.isArray(users) ? users : []
  }

  /**
   * Get games with safe error handling
   * Returns empty array on error
   */
  async getGames(params?: any): Promise<any[]> {
    const queryString = new URLSearchParams(params).toString()
    const result = await this.fetchWithErrorHandling(`/games?${queryString}`)

    // Ensure we always return an array
    if (result.error) {
      return []
    }

    return result.data || []
  }

  /**
   * Get assignments with safe error handling
   * Returns empty array on error
   */
  async getAssignments(params?: any): Promise<any[]> {
    const queryString = new URLSearchParams(params).toString()
    const result = await this.fetchWithErrorHandling(`/assignments?${queryString}`)

    // Ensure we always return an array
    if (result.error) {
      return []
    }

    return result.data?.assignments || result.data || []
  }
}

export default new SafeAPIService()