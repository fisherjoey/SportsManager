'use client'

import { toast } from 'sonner'

// Basic toast utilities
export const toastUtils = {
  success: (message: string, description?: string) => {
    toast.success(message, { description })
  },

  error: (message: string, description?: string) => {
    toast.error(message, { description })
  },

  warning: (message: string, description?: string) => {
    toast.warning(message, { description })
  },

  info: (message: string, description?: string) => {
    toast.info(message, { description })
  },

  loading: (message: string, description?: string) => {
    return toast.loading(message, { description })
  },

  promise: <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error
    })
  }
}

// Entity-specific toast utilities
export const entityToasts = {
  // Game-related toasts
  game: {
    created: (gameName?: string) => 
      toastUtils.success('Game created', gameName ? `"${gameName}" has been created successfully` : undefined),
    
    updated: (gameName?: string) => 
      toastUtils.success('Game updated', gameName ? `"${gameName}" has been updated successfully` : undefined),
    
    deleted: (gameName?: string) => 
      toastUtils.success('Game deleted', gameName ? `"${gameName}" has been deleted` : undefined),
    
    assigned: (refereeName: string, gameName?: string) => 
      toastUtils.success('Referee assigned', `${refereeName} has been assigned${gameName ? ` to "${gameName}"` : ''}`),
    
    unassigned: (refereeName: string, gameName?: string) => 
      toastUtils.info('Referee unassigned', `${refereeName} has been removed${gameName ? ` from "${gameName}"` : ''}`),
    
    createError: (error?: string) => 
      toastUtils.error('Failed to create game', error || 'Please try again'),
    
    updateError: (error?: string) => 
      toastUtils.error('Failed to update game', error || 'Please try again'),
    
    deleteError: (error?: string) => 
      toastUtils.error('Failed to delete game', error || 'Please try again')
  },

  // Referee-related toasts
  referee: {
    created: (refereeName?: string) => 
      toastUtils.success('Referee added', refereeName ? `"${refereeName}" has been added successfully` : undefined),
    
    updated: (refereeName?: string) => 
      toastUtils.success('Referee updated', refereeName ? `"${refereeName}" has been updated successfully` : undefined),
    
    deleted: (refereeName?: string) => 
      toastUtils.success('Referee removed', refereeName ? `"${refereeName}" has been removed` : undefined),
    
    availabilityUpdated: (refereeName?: string) => 
      toastUtils.success('Availability updated', refereeName ? `${refereeName}'s availability has been updated` : undefined),
    
    createError: (error?: string) => 
      toastUtils.error('Failed to add referee', error || 'Please try again'),
    
    updateError: (error?: string) => 
      toastUtils.error('Failed to update referee', error || 'Please try again'),
    
    deleteError: (error?: string) => 
      toastUtils.error('Failed to remove referee', error || 'Please try again')
  },

  // Team-related toasts
  team: {
    created: (teamName?: string) => 
      toastUtils.success('Team created', teamName ? `"${teamName}" has been created successfully` : undefined),
    
    updated: (teamName?: string) => 
      toastUtils.success('Team updated', teamName ? `"${teamName}" has been updated successfully` : undefined),
    
    deleted: (teamName?: string) => 
      toastUtils.success('Team deleted', teamName ? `"${teamName}" has been deleted` : undefined),
    
    createError: (error?: string) => 
      toastUtils.error('Failed to create team', error || 'Please try again'),
    
    updateError: (error?: string) => 
      toastUtils.error('Failed to update team', error || 'Please try again'),
    
    deleteError: (error?: string) => 
      toastUtils.error('Failed to delete team', error || 'Please try again')
  },

  // Location-related toasts
  location: {
    created: (locationName?: string) => 
      toastUtils.success('Location created', locationName ? `"${locationName}" has been created successfully` : undefined),
    
    updated: (locationName?: string) => 
      toastUtils.success('Location updated', locationName ? `"${locationName}" has been updated successfully` : undefined),
    
    deleted: (locationName?: string) => 
      toastUtils.success('Location deleted', locationName ? `"${locationName}" has been deleted` : undefined),
    
    createError: (error?: string) => 
      toastUtils.error('Failed to create location', error || 'Please try again'),
    
    updateError: (error?: string) => 
      toastUtils.error('Failed to update location', error || 'Please try again'),
    
    deleteError: (error?: string) => 
      toastUtils.error('Failed to delete location', error || 'Please try again')
  }
}

// System-level toasts
export const systemToasts = {
  // Authentication
  auth: {
    loginSuccess: (userName?: string) => 
      toastUtils.success('Welcome back!', userName ? `Good to see you, ${userName}` : undefined),
    
    loginError: (error?: string) => 
      toastUtils.error('Login failed', error || 'Please check your credentials'),
    
    logoutSuccess: () => 
      toastUtils.info('Logged out', 'You have been successfully logged out'),
    
    sessionExpired: () => 
      toastUtils.warning('Session expired', 'Please log in again')
  },

  // Data operations
  data: {
    loadError: (entityType?: string) => 
      toastUtils.error('Failed to load data', entityType ? `Could not load ${entityType}` : 'Please refresh the page'),
    
    saveSuccess: () => 
      toastUtils.success('Changes saved', 'Your changes have been saved successfully'),
    
    saveError: (error?: string) => 
      toastUtils.error('Failed to save changes', error || 'Please try again'),
    
    exportSuccess: (fileName?: string) => 
      toastUtils.success('Export completed', fileName ? `File "${fileName}" has been downloaded` : undefined),
    
    exportError: () => 
      toastUtils.error('Export failed', 'Could not export the data'),
    
    importSuccess: (count?: number) => 
      toastUtils.success('Import completed', count ? `Successfully imported ${count} items` : undefined),
    
    importError: (error?: string) => 
      toastUtils.error('Import failed', error || 'Please check your file format')
  },

  // Network and connectivity
  network: {
    offline: () => 
      toastUtils.warning('You\'re offline', 'Some features may not be available'),
    
    online: () => 
      toastUtils.success('Back online', 'All features are now available'),
    
    connectionError: () => 
      toastUtils.error('Connection error', 'Please check your internet connection'),
    
    serverError: () => 
      toastUtils.error('Server error', 'Please try again later')
  },

  // Validation and form errors
  validation: {
    required: (fieldName: string) => 
      toastUtils.error('Required field missing', `Please fill in the ${fieldName} field`),
    
    invalid: (fieldName: string) => 
      toastUtils.error('Invalid format', `Please check the ${fieldName} format`),
    
    duplicate: (entityType: string, value: string) => 
      toastUtils.error('Duplicate entry', `A ${entityType} with "${value}" already exists`)
  }
}

// AI and automation toasts
export const aiToasts = {
  assignment: {
    generating: () => 
      toastUtils.loading('Generating assignments', 'AI is analyzing referee availability and game requirements'),
    
    generated: (count: number) => 
      toastUtils.success('Assignments generated', `AI has suggested assignments for ${count} games`),
    
    applied: (count: number) => 
      toastUtils.success('Assignments applied', `Successfully applied ${count} AI-generated assignments`),
    
    error: () => 
      toastUtils.error('AI assignment failed', 'Could not generate automatic assignments')
  },

  optimization: {
    optimizing: () => 
      toastUtils.loading('Optimizing schedule', 'AI is analyzing the best scheduling options'),
    
    optimized: () => 
      toastUtils.success('Schedule optimized', 'AI has improved the current schedule'),
    
    error: () => 
      toastUtils.error('Optimization failed', 'Could not optimize the schedule')
  }
}

// Bulk operation toasts
export const bulkToasts = {
  selection: {
    selected: (count: number, entityType: string) => 
      toastUtils.info(`${count} ${entityType} selected`, 'Use the bulk actions menu to perform operations'),
    
    cleared: () => 
      toastUtils.info('Selection cleared', 'All items have been deselected')
  },

  operations: {
    deleteConfirm: (count: number, entityType: string) => 
      toastUtils.warning(`Delete ${count} ${entityType}?`, 'This action cannot be undone'),
    
    deleteSuccess: (count: number, entityType: string) => 
      toastUtils.success(`Deleted ${count} ${entityType}`, 'The selected items have been removed'),
    
    updateSuccess: (count: number, entityType: string) => 
      toastUtils.success(`Updated ${count} ${entityType}`, 'The selected items have been updated'),
    
    operationError: (operation: string, error?: string) => 
      toastUtils.error(`${operation} failed`, error || 'Please try again')
  }
}

// Utility function for handling API responses with toast notifications
export const handleApiResponse = async <T>(
  promise: Promise<T>,
  {
    successMessage,
    errorMessage,
    loadingMessage
  }: {
    successMessage?: string
    errorMessage?: string  
    loadingMessage?: string
  } = {}
): Promise<T> => {
  if (loadingMessage) {
    const loadingToast = toastUtils.loading(loadingMessage)
    
    try {
      const result = await promise
      toast.dismiss(loadingToast)
      if (successMessage) {
        toastUtils.success(successMessage)
      }
      return result
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error instanceof Error ? error.message : String(error)
      toastUtils.error(errorMessage || 'Operation failed', message)
      throw error
    }
  } else {
    try {
      const result = await promise
      if (successMessage) {
        toastUtils.success(successMessage)
      }
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toastUtils.error(errorMessage || 'Operation failed', message)
      throw error
    }
  }
}