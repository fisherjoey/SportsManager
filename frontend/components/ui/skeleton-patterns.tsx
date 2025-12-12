import { cn } from '@/lib/utils';

import { Skeleton } from './skeleton';

interface SkeletonPatternProps {
  className?: string;
}

/**
 * Card skeleton with header, content, and footer sections
 * Matches the structure of Card components
 */
export function CardSkeleton({ className }: SkeletonPatternProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-6 shadow-sm', className)}>
      {/* Card Header */}
      <div className="space-y-2 pb-4">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Card Content */}
      <div className="space-y-3 pt-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>

      {/* Card Footer */}
      <div className="flex items-center gap-2 pt-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

/**
 * Table row skeleton for loading table data
 * Matches the structure of table rows with multiple columns
 */
export function TableRowSkeleton({
  columns = 4,
  className,
}: SkeletonPatternProps & { columns?: number }) {
  return (
    <div className={cn('flex items-center gap-4 border-b py-4', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className={cn('h-5', i === 0 ? 'w-1/4' : 'flex-1')} />
      ))}
    </div>
  );
}

/**
 * Complete table skeleton with header and multiple rows
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: SkeletonPatternProps & { rows?: number; columns?: number }) {
  return (
    <div className={cn('w-full space-y-0', className)}>
      {/* Table Header */}
      <div className="flex items-center gap-4 border-b bg-muted/30 py-3 px-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('h-4', i === 0 ? 'w-1/4' : 'flex-1')}
          />
        ))}
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} className="px-2" />
      ))}
    </div>
  );
}

/**
 * Dashboard skeleton with stats grid and card layout
 * Matches typical dashboard layouts with metrics and content cards
 */
export function DashboardSkeleton({ className }: SkeletonPatternProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Page Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Table Section */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6 pb-4">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="px-6 pb-6">
          <TableSkeleton rows={5} columns={4} />
        </div>
      </div>
    </div>
  );
}

/**
 * Form skeleton with various input types
 * Matches typical form layouts with labels and input fields
 */
export function FormSkeleton({
  fields = 4,
  className,
}: SkeletonPatternProps & { fields?: number }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Form Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      {/* Additional Fields Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Textarea Field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-32 w-full" />
      </div>

      {/* Form Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * List item skeleton for loading lists of items
 */
export function ListItemSkeleton({ className }: SkeletonPatternProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border bg-card p-4',
        className
      )}
    >
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

/**
 * List skeleton with multiple items
 */
export function ListSkeleton({
  items = 5,
  className,
}: SkeletonPatternProps & { items?: number }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Profile skeleton for user profile pages
 */
export function ProfileSkeleton({ className }: SkeletonPatternProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Profile Header */}
      <div className="flex items-start gap-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 rounded-lg border bg-card p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 text-center">
            <Skeleton className="h-7 w-16 mx-auto" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        ))}
      </div>

      {/* Content Sections */}
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

/**
 * Grid skeleton for card grids
 */
export function GridSkeleton({
  items = 6,
  columns = 3,
  className,
}: SkeletonPatternProps & { items?: number; columns?: number }) {
  const gridColsClass =
    {
      1: 'grid-cols-1',
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-2 lg:grid-cols-3',
      4: 'md:grid-cols-2 lg:grid-cols-4',
    }[columns] || 'md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={cn('grid gap-4', gridColsClass, className)}>
      {Array.from({ length: items }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
