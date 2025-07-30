"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  onSubmit: (data: any) => void | Promise<void>
  children: React.ReactNode
  submitText?: string
  cancelText?: string
  maxWidth?: string
  disabled?: boolean
  initialData?: any
  resetFormOnSuccess?: boolean
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  children,
  submitText = "Submit",
  cancelText = "Cancel",
  maxWidth = "sm:max-w-[425px]",
  disabled = false,
  resetFormOnSuccess = true
}: FormDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (disabled || loading) return

    try {
      setLoading(true)
      const formData = new FormData(e.target as HTMLFormElement)
      const data = Object.fromEntries(formData.entries())
      
      await onSubmit(data)
      
      if (resetFormOnSuccess) {
        ;(e.target as HTMLFormElement).reset()
      }
      
      onOpenChange(false)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (!loading) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidth}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {children}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button 
              type="submit" 
              disabled={disabled || loading}
            >
              {loading ? "Loading..." : submitText}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Enhanced version with custom form handling for complex forms
interface CustomFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  onSubmit: (data: any) => void | Promise<void>
  children: (props: { loading: boolean; handleSubmit: (data: any) => Promise<void> }) => React.ReactNode
  submitText?: string
  cancelText?: string
  maxWidth?: string
  showActions?: boolean
}

export function CustomFormDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  children,
  submitText = "Submit",
  cancelText = "Cancel",
  maxWidth = "sm:max-w-[425px]",
  showActions = true
}: CustomFormDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (data: any) => {
    try {
      setLoading(true)
      await onSubmit(data)
      onOpenChange(false)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (!loading) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidth}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        
        <div className="space-y-4">
          {children({ loading, handleSubmit })}
          
          {showActions && (
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={loading}
              >
                {cancelText}
              </Button>
              <Button 
                type="submit" 
                form="dialog-form"
                disabled={loading}
              >
                {loading ? "Loading..." : submitText}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}