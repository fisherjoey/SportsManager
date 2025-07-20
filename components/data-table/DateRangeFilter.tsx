"use client"

import * as React from "react"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, isToday, parseISO, isValid } from "date-fns"

interface DateRangeFilterProps {
  startDate?: Date
  endDate?: Date
  onStartDateChange: (date: Date | undefined) => void
  onEndDateChange: (date: Date | undefined) => void
  onClear: () => void
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
}: DateRangeFilterProps) {
  const [startInputValue, setStartInputValue] = React.useState("")
  const [endInputValue, setEndInputValue] = React.useState("")
  const [isStartOpen, setIsStartOpen] = React.useState(false)
  const [isEndOpen, setIsEndOpen] = React.useState(false)

  // Update input values when dates change
  React.useEffect(() => {
    setStartInputValue(startDate ? format(startDate, "yyyy-MM-dd") : "")
  }, [startDate])

  React.useEffect(() => {
    setEndInputValue(endDate ? format(endDate, "yyyy-MM-dd") : "")
  }, [endDate])

  const handleStartInputChange = (value: string) => {
    setStartInputValue(value)
    if (value === "") {
      onStartDateChange(undefined)
      return
    }

    const date = parseISO(value)
    if (isValid(date)) {
      onStartDateChange(date)
    }
  }

  const handleEndInputChange = (value: string) => {
    setEndInputValue(value)
    if (value === "") {
      onEndDateChange(undefined)
      return
    }

    const date = parseISO(value)
    if (isValid(date)) {
      onEndDateChange(date)
    }
  }

  const setToday = () => {
    const today = new Date()
    onStartDateChange(today)
    onEndDateChange(today)
    setIsStartOpen(false)
    setIsEndOpen(false)
  }

  const hasActiveFilter = startDate || endDate

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Date Range</Label>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={setToday}
            className="h-7 px-2 text-xs"
          >
            Today
          </Button>
          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 px-2 text-xs"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Start Date */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <div className="space-y-1">
            <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-8 px-2 text-xs justify-start font-normal"
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {startDate ? format(startDate, "MMM dd") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    onStartDateChange(date)
                    setIsStartOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Input
              type="date"
              value={startInputValue}
              onChange={(e) => handleStartInputChange(e.target.value)}
              className="h-7 text-xs"
              placeholder="YYYY-MM-DD"
            />
          </div>
        </div>

        {/* End Date */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <div className="space-y-1">
            <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-8 px-2 text-xs justify-start font-normal"
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {endDate ? format(endDate, "MMM dd") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    onEndDateChange(date)
                    setIsEndOpen(false)
                  }}
                  disabled={(date) => startDate ? date < startDate : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Input
              type="date"
              value={endInputValue}
              onChange={(e) => handleEndInputChange(e.target.value)}
              className="h-7 text-xs"
              placeholder="YYYY-MM-DD"
            />
          </div>
        </div>
      </div>

      {/* Active filter display */}
      {hasActiveFilter && (
        <div className="text-xs text-muted-foreground">
          {startDate && endDate
            ? `${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd")}`
            : startDate
            ? `From ${format(startDate, "MMM dd")}`
            : endDate
            ? `Until ${format(endDate, "MMM dd")}`
            : ""}
        </div>
      )}
    </div>
  )
}