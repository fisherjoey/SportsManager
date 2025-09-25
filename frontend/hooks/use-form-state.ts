"use client"

import { useState, useCallback, useRef } from "react"

interface UseFormStateOptions<T> {
  initialData: T
  onSubmit?: (data: T) => Promise<void> | void
  validate?: (data: T) => Record<string, string> | null
  resetOnSubmit?: boolean
}

interface UseFormStateReturn<T> {
  data: T
  errors: Record<string, string>
  loading: boolean
  isDirty: boolean
  setData: (data: T | ((prev: T) => T)) => void
  updateField: <K extends keyof T>(field: K, value: T[K]) => void
  setErrors: (errors: Record<string, string>) => void
  clearErrors: () => void
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  reset: () => void
  setLoading: (loading: boolean) => void
}

export function useFormState<T extends Record<string, any>>({
  initialData,
  onSubmit,
  validate,
  resetOnSubmit = false
}: UseFormStateOptions<T>): UseFormStateReturn<T> {
  const [data, setData] = useState<T>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const initialDataRef = useRef(initialData)

  // Check if form data has changed from initial state
  const isDirty = JSON.stringify(data) !== JSON.stringify(initialDataRef.current)

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field as string]
        return newErrors
      })
    }
  }, [errors])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const reset = useCallback(() => {
    setData(initialData)
    setErrors({})
    setLoading(false)
    initialDataRef.current = initialData
  }, [initialData])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    // Clear previous errors
    clearErrors()

    // Validate if validator provided
    if (validate) {
      const validationErrors = validate(data)
      if (validationErrors) {
        setErrors(validationErrors)
        return
      }
    }

    if (!onSubmit) return

    try {
      setLoading(true)
      await onSubmit(data)
      
      if (resetOnSubmit) {
        reset()
      }
    } catch (error) {
      console.error('Form submission error:', error)
      // If error has validation errors, set them
      if (error && typeof error === 'object' && 'validationErrors' in error) {
        setErrors((error as any).validationErrors)
      } else {
        // Generic error
        setErrors({ submit: 'An error occurred while submitting the form' })
      }
    } finally {
      setLoading(false)
    }
  }, [data, validate, onSubmit, resetOnSubmit, clearErrors, reset])

  return {
    data,
    errors,
    loading,
    isDirty,
    setData,
    updateField,
    setErrors,
    clearErrors,
    handleSubmit,
    reset,
    setLoading
  }
}

// Specialized hook for common form patterns
export function useEntityFormState<T extends Record<string, any>>(
  initialData: T,
  onSave: (data: T) => Promise<void>,
  options?: {
    validate?: (data: T) => Record<string, string> | null
    resetOnSave?: boolean
  }
) {
  return useFormState({
    initialData,
    onSubmit: onSave,
    validate: options?.validate,
    resetOnSubmit: options?.resetOnSave ?? true
  })
}

// Hook for dialog forms
export function useDialogFormState<T extends Record<string, any>>(
  initialData: T,
  onSubmit: (data: T) => Promise<void>,
  onClose?: () => void
) {
  const formState = useFormState({
    initialData,
    onSubmit: async (data: T) => {
      await onSubmit(data)
      onClose?.()
    },
    resetOnSubmit: true
  })

  const handleCancel = useCallback(() => {
    formState.reset()
    onClose?.()
  }, [formState, onClose])

  return {
    ...formState,
    handleCancel
  }
}

// Hook for search/filter forms
export function useSearchFormState<T extends Record<string, any>>(
  initialData: T,
  onSearch: (data: T) => void,
  debounceMs: number = 300
) {
  const [data, setData] = useState<T>(initialData)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    const newData = { ...data, [field]: value }
    setData(newData)

    // Debounce the search
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      onSearch(newData)
    }, debounceMs)
  }, [data, onSearch, debounceMs])

  const reset = useCallback(() => {
    setData(initialData)
    onSearch(initialData)
  }, [initialData, onSearch])

  const immediateSearch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    onSearch(data)
  }, [data, onSearch])

  return {
    data,
    setData,
    updateField,
    reset,
    immediateSearch
  }
}