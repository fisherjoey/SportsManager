# Mentorship System Components

A comprehensive set of React components for managing mentor-mentee relationships in the sports management system.

## Components Overview

### 1. MentorDashboard
Main dashboard for mentors showing overview of assigned mentees, stats, and quick actions.

**Features:**
- Overview cards with key metrics (active mentees, upcoming sessions, goals)
- Interactive mentee cards with progress indicators
- Upcoming sessions and priority goals lists
- Quick navigation to detailed views

**Usage:**
```tsx
<MentorDashboard
  mentorId="mentor-123"
  onSelectMentee={(mentee) => console.log('Selected:', mentee)}
  onViewMenteeDetails={(mentee) => console.log('View details:', mentee)}
/>
```

### 2. MenteeSelector
Dropdown component for mentors to select/filter by specific mentees.

**Features:**
- Search and filter mentees
- Visual progress indicators
- Status badges (active/inactive)
- "All Mentees" option for unfiltered views
- Compact and full-featured variants

**Usage:**
```tsx
<MenteeSelector
  mentorId="mentor-123"
  selectedMenteeId={selectedMenteeId}
  onMenteeSelect={setSelectedMentee}
  placeholder="Select mentee..."
  showAllOption={true}
/>
```

### 3. MenteesList
Table/grid view of all assigned mentees with search, filtering, and actions.

**Features:**
- Advanced filtering by level, status, and search terms
- Progress tracking and goal completion stats
- Recent activity indicators
- Mobile-responsive with card layout
- Export to CSV functionality
- Quick action buttons (view, schedule, note)

**Usage:**
```tsx
<MenteesList
  mentorId="mentor-123"
  onViewDetails={(mentee) => handleViewDetails(mentee)}
  onScheduleSession={(mentee) => handleScheduling(mentee)}
  onAddNote={(mentee) => handleNoteAdd(mentee)}
/>
```

### 4. MenteeDetailsView
Comprehensive mentee information display with tabbed interface.

**Features:**
- **Profile Tab:** Personal information, contact details, development profile
- **Notes Tab:** Rich text notes with categories and privacy settings
- **Documents Tab:** File upload/download with categorization
- **Goals Tab:** Development goals with progress tracking
- **Sessions Tab:** Mentorship session history and scheduling

**Usage:**
```tsx
<MenteeDetailsView
  menteeId="mentee-456"
  mentorId="mentor-123"
  onClose={() => setShowDetails(false)}
  onMenteeUpdate={(mentee) => handleMenteeUpdate(mentee)}
/>
```

### 5. DocumentManager
Advanced document management system for mentee files.

**Features:**
- File upload with drag-and-drop support
- Document categorization (evaluation, training, certification, feedback, other)
- Privacy controls (private/public documents)
- Search and filter documents
- Download and delete functionality
- File type detection with appropriate icons
- File size display and validation

**Usage:**
```tsx
<DocumentManager
  menteeId="mentee-456"
  mentorId="mentor-123"
  documents={documents}
  onDocumentsChange={setDocuments}
/>
```

## Type System

The components use comprehensive TypeScript interfaces:

```tsx
import type {
  Mentor,
  Mentee,
  MentorshipAssignment,
  MenteeDocument,
  MenteeNote,
  MentorshipGoal,
  MentorshipSession
} from '@/types/mentorship'
```

## Integration Patterns

### 1. Role-Based Visibility
```tsx
// Only show for users with mentor role
{userHasRole('mentor') && (
  <MentorDashboard mentorId={user.id} />
)}
```

### 2. Adding to Existing Pages
```tsx
// Games page with mentee filtering for mentors
<div className="flex justify-between">
  <h1>Games</h1>
  {isMentor && (
    <MenteeSelector
      mentorId={user.id}
      onMenteeSelect={setSelectedMentee}
    />
  )}
</div>
```

### 3. Navigation Integration
```tsx
// Add to main navigation
const navigationItems = [
  { href: '/games', label: 'Games' },
  { href: '/assignments', label: 'Assignments' },
  ...(isMentor ? [{ href: '/mentorship', label: 'Mentorship' }] : [])
]
```

## API Requirements

The components expect these API endpoints:

### Mentors
- `GET /mentors/{id}` - Get mentor profile and stats
- `GET /mentors/{id}/mentees` - Get assigned mentees

### Mentees
- `GET /mentees/{id}` - Get mentee details
- `PUT /mentees/{id}` - Update mentee information
- `GET /mentees/{id}/notes` - Get mentee notes
- `POST /mentees/{id}/notes` - Create new note
- `GET /mentees/{id}/documents` - Get mentee documents
- `GET /mentees/{id}/goals` - Get mentee goals
- `GET /mentees/{id}/sessions` - Get mentee sessions

### Documents
- `POST /mentee-documents` - Upload document
- `GET /mentee-documents/{id}/download` - Download document
- `PATCH /mentee-documents/{id}` - Update document (privacy, etc.)
- `DELETE /mentee-documents/{id}` - Delete document

## Styling and Theming

Components use Tailwind CSS with shadcn/ui design tokens:
- Consistent with existing application design
- Dark/light mode support
- Mobile-first responsive design
- Accessible color schemes and contrast

## Mobile Responsiveness

All components are fully mobile-responsive:
- **MentorDashboard:** Stacked cards on mobile, horizontal scroll for stats
- **MenteesList:** Switches to card layout on mobile with touch-friendly controls
- **MenteeSelector:** Optimized dropdown with touch targets
- **MenteeDetailsView:** Tabbed interface optimized for mobile screens
- **DocumentManager:** Mobile-friendly upload and grid layout

## Accessibility Features

- Keyboard navigation support
- Screen reader compatible
- High contrast color schemes
- Focus indicators
- ARIA labels and descriptions
- Semantic HTML structure

## Performance Considerations

- Components use React.memo() where appropriate
- Lazy loading for large document lists
- Debounced search functionality
- Efficient re-rendering with proper dependency arrays
- Image optimization for profile photos

## Example Usage

See `MentorshipExample.tsx` for complete integration examples showing:
- Navigation between dashboard and mentee list
- Mentee selection and filtering
- Detail view integration
- Role-based component visibility

## File Structure
```
components/mentorship/
├── index.ts                 # Export all components
├── MentorDashboard.tsx      # Main mentor dashboard
├── MenteeSelector.tsx       # Mentee selection dropdown
├── MenteesList.tsx          # Mentee table/grid view
├── MenteeDetailsView.tsx    # Detailed mentee information
├── DocumentManager.tsx      # Document management
├── MentorshipExample.tsx    # Usage examples
└── README.md               # This documentation
```

## Next Steps

1. **API Implementation:** Create backend endpoints matching the expected API contract
2. **Authentication Integration:** Add role-based access control
3. **Real-time Updates:** Consider WebSocket integration for session updates
4. **Testing:** Add unit tests and integration tests for components
5. **Analytics:** Add tracking for mentorship program effectiveness