# Phase 4: Frontend Updates Documentation
**Duration**: 20 minutes
**Goal**: Update frontend components to handle the new role structure and fix console errors

## Overview
This phase fixes frontend components that are causing console errors, particularly the MenteeSelector component, and updates UI components to properly display referee roles and levels.

---

## Fix 4.1: MenteeSelector Component

### File Location
`/frontend/components/mentorship/MenteeSelector.tsx`

### Current Issues
- Unsafe array access causing undefined errors
- No error handling for failed API calls
- Component crashes when mentorship data is missing

### Fixed Code

```typescript
import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface MenteeSelectorProps {
  userId: string;
  onSelect?: (mentee: User) => void;
  className?: string;
}

interface MenteeWithAssignment extends User {
  mentorship_assignments?: Array<{
    id: string;
    game_id: string;
    status: string;
  }>;
}

export const MenteeSelector: React.FC<MenteeSelectorProps> = ({
  userId,
  onSelect,
  className = ''
}) => {
  const [mentees, setMentees] = useState<MenteeWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMentee, setSelectedMentee] = useState<string>('');

  useEffect(() => {
    fetchMentees();
  }, [userId]);

  const fetchMentees = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/mentorships/mentees/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Don't crash on 404 or 500 errors
        if (response.status === 404) {
          setMentees([]);
          return;
        }
        throw new Error(`Failed to fetch mentees: ${response.status}`);
      }

      const data = await response.json();
      setMentees(Array.isArray(data) ? data : []);

    } catch (err) {
      console.error('Failed to fetch mentees:', err);
      setError('Unable to load mentees');
      setMentees([]); // Set empty array to prevent crashes

    } finally {
      setLoading(false);
    }
  };

  const handleSelectMentee = (menteeId: string) => {
    setSelectedMentee(menteeId);
    const mentee = mentees.find(m => m.id === menteeId);
    if (mentee && onSelect) {
      onSelect(mentee);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`mentee-selector ${className}`}>
        <div className="loading-spinner">Loading mentees...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`mentee-selector ${className}`}>
        <div className="error-message">
          {error}
          <button onClick={fetchMentees} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (mentees.length === 0) {
    return (
      <div className={`mentee-selector ${className}`}>
        <div className="empty-state">
          <p>No mentees assigned</p>
        </div>
      </div>
    );
  }

  // Render mentees list
  return (
    <div className={`mentee-selector ${className}`}>
      <select
        value={selectedMentee}
        onChange={(e) => handleSelectMentee(e.target.value)}
        className="mentee-select"
      >
        <option value="">Select a mentee...</option>
        {mentees.map(mentee => {
          // Safe access to nested properties
          const firstAssignment = mentee.mentorship_assignments?.[0];
          const assignmentStatus = firstAssignment?.status || 'No assignment';

          return (
            <option key={mentee.id} value={mentee.id}>
              {mentee.name} - {assignmentStatus}
            </option>
          );
        })}
      </select>

      {selectedMentee && (
        <MenteeDetails mentee={mentees.find(m => m.id === selectedMentee)} />
      )}
    </div>
  );
};

// Sub-component for displaying mentee details
const MenteeDetails: React.FC<{ mentee?: MenteeWithAssignment }> = ({ mentee }) => {
  if (!mentee) return null;

  // Safe access to assignments
  const assignments = mentee.mentorship_assignments || [];

  return (
    <div className="mentee-details">
      <h4>{mentee.name}</h4>
      <p>Email: {mentee.email}</p>
      <p>Assignments: {assignments.length}</p>
      {assignments.length > 0 && (
        <ul>
          {assignments.map((assignment, index) => (
            <li key={assignment.id || index}>
              Game: {assignment.game_id} - Status: {assignment.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MenteeSelector;
```

---

## Fix 4.2: Referee Role Display Components

### File Location
Create utility file: `/frontend/utils/refereeHelpers.ts`

### Helper Functions for Role Display

```typescript
import { User, Role } from '../types';

/**
 * Check if a user is any type of referee
 * @param user - The user to check
 * @returns True if user has Referee role
 */
export function isReferee(user: User): boolean {
  if (!user.roles || !Array.isArray(user.roles)) {
    // Fallback to legacy role field
    return user.role === 'referee' || user.role === 'Referee';
  }

  return user.roles.some(role =>
    typeof role === 'string' ? role === 'Referee' : role.name === 'Referee'
  );
}

/**
 * Get the referee specialization level
 * @param user - The user to check
 * @returns The referee level or empty string
 */
export function getRefereeLevel(user: User): string {
  if (!user.roles || !Array.isArray(user.roles)) {
    return '';
  }

  const levelPriority = [
    'Head Referee',
    'Senior Referee',
    'Junior Referee',
    'Rookie Referee',
    'Referee Coach'
  ];

  for (const level of levelPriority) {
    const hasLevel = user.roles.some(role =>
      typeof role === 'string' ? role === level : role.name === level
    );
    if (hasLevel) {
      return level;
    }
  }

  // If they only have base Referee role
  if (isReferee(user)) {
    return 'Referee';
  }

  return '';
}

/**
 * Get display badge color for referee level
 * @param level - The referee level
 * @returns CSS class name for the badge
 */
export function getRefereeLevelBadgeClass(level: string): string {
  switch (level) {
    case 'Head Referee':
      return 'badge-referee-head';
    case 'Senior Referee':
      return 'badge-referee-senior';
    case 'Junior Referee':
      return 'badge-referee-junior';
    case 'Rookie Referee':
      return 'badge-referee-rookie';
    case 'Referee Coach':
      return 'badge-referee-coach';
    case 'Referee':
      return 'badge-referee-base';
    default:
      return 'badge-default';
  }
}

/**
 * Check if user can perform mentor actions
 * @param user - The user to check
 * @returns True if user can mentor
 */
export function canMentor(user: User): boolean {
  if (!user.roles) return false;

  const mentorRoles = ['Senior Referee', 'Head Referee', 'Referee Coach'];
  return user.roles.some(role => {
    const roleName = typeof role === 'string' ? role : role.name;
    return mentorRoles.includes(roleName);
  });
}

/**
 * Check if user can evaluate other referees
 * @param user - The user to check
 * @returns True if user can evaluate
 */
export function canEvaluate(user: User): boolean {
  if (!user.roles) return false;

  const evaluatorRoles = ['Senior Referee', 'Head Referee', 'Referee Coach'];
  return user.roles.some(role => {
    const roleName = typeof role === 'string' ? role : role.name;
    return evaluatorRoles.includes(roleName);
  });
}

/**
 * Format referee display name with level
 * @param user - The user
 * @returns Formatted display name
 */
export function getRefereeDisplayName(user: User): string {
  const level = getRefereeLevel(user);
  if (!level || level === 'Referee') {
    return user.name;
  }

  // Shorten the level for display
  const shortLevel = level
    .replace('Referee', 'Ref')
    .replace('Senior', 'Sr.')
    .replace('Junior', 'Jr.')
    .replace('Rookie', 'Rk.');

  return `${user.name} (${shortLevel})`;
}
```

---

## Fix 4.3: Update Referee List Component

### File Location
`/frontend/components/RefereeList.tsx` or similar

### Updated Component

```typescript
import React, { useState, useEffect } from 'react';
import {
  isReferee,
  getRefereeLevel,
  getRefereeLevelBadgeClass,
  getRefereeDisplayName
} from '../utils/refereeHelpers';

interface RefereeListProps {
  filterLevel?: string;
  onSelectReferee?: (referee: any) => void;
}

export const RefereeList: React.FC<RefereeListProps> = ({
  filterLevel,
  onSelectReferee
}) => {
  const [referees, setReferees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReferees();
  }, [filterLevel]);

  const fetchReferees = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/api/users?';
      if (filterLevel) {
        url += `level=${encodeURIComponent(filterLevel)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        // Handle error gracefully
        if (response.status === 500) {
          console.error('Server error fetching referees');
          setReferees([]);
          setError('Unable to load referees. Please try again later.');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const users = data.users || data.data || [];

      // Filter to only show referees
      const refereesOnly = users.filter(isReferee);
      setReferees(refereesOnly);

    } catch (err) {
      console.error('Failed to fetch referees:', err);
      setError('Failed to load referees');
      setReferees([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading referees...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={fetchReferees} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  if (referees.length === 0) {
    return (
      <div className="empty-state">
        <p>No referees found</p>
      </div>
    );
  }

  return (
    <div className="referee-list">
      <div className="referee-grid">
        {referees.map(referee => {
          const level = getRefereeLevel(referee);
          const badgeClass = getRefereeLevelBadgeClass(level);

          return (
            <div
              key={referee.id}
              className="referee-card"
              onClick={() => onSelectReferee?.(referee)}
            >
              <div className="referee-header">
                <h3>{referee.name}</h3>
                {level && (
                  <span className={`badge ${badgeClass}`}>
                    {level}
                  </span>
                )}
              </div>
              <div className="referee-info">
                <p>{referee.email}</p>
                <p>Available: {referee.is_available ? '✓' : '✗'}</p>
                {referee.should_display_white_whistle && (
                  <span className="white-whistle-indicator">🏆</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

---

## Fix 4.4: Update User Profile Component

### File Location
`/frontend/components/UserProfile.tsx` or similar

### Show Roles Properly

```typescript
import React from 'react';
import { isReferee, getRefereeLevel, canMentor, canEvaluate } from '../utils/refereeHelpers';

interface UserProfileProps {
  user: any;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const refereeLevel = getRefereeLevel(user);
  const isMentor = canMentor(user);
  const isEvaluator = canEvaluate(user);

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>

      {/* Display all roles */}
      {user.roles && user.roles.length > 0 && (
        <div className="roles-section">
          <h3>Roles</h3>
          <div className="role-badges">
            {user.roles.map((role: any, index: number) => {
              const roleName = typeof role === 'string' ? role : role.name;
              return (
                <span key={index} className="role-badge">
                  {roleName}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Referee-specific section */}
      {isReferee(user) && (
        <div className="referee-section">
          <h3>Referee Information</h3>
          <p>Level: {refereeLevel || 'Standard Referee'}</p>

          {isMentor && (
            <div className="capability-badge">
              ✓ Can Mentor Other Referees
            </div>
          )}

          {isEvaluator && (
            <div className="capability-badge">
              ✓ Can Evaluate Referees
            </div>
          )}

          {user.referee_profile && (
            <div className="referee-stats">
              <p>Games Assigned: {user.referee_profile.total_games || 0}</p>
              <p>Rating: {user.referee_profile.rating || 'N/A'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## Fix 4.5: Update API Service Layer

### File Location
`/frontend/services/api.ts` or similar

### Add Error Handling to API Calls

```typescript
class APIService {
  private baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  private async fetchWithErrorHandling(
    url: string,
    options: RequestInit = {}
  ): Promise<any> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.baseURL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          ...options.headers
        }
      });

      // Return empty data for server errors instead of throwing
      if (response.status >= 500) {
        console.error(`Server error on ${url}:`, response.status);
        return { data: [], error: true, status: response.status };
      }

      if (!response.ok && response.status !== 404) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return { data, error: false, status: response.status };

    } catch (error) {
      console.error(`API call failed for ${url}:`, error);
      return { data: [], error: true, message: error.message };
    }
  }

  async getReferees(filters?: any) {
    const params = new URLSearchParams(filters).toString();
    const result = await this.fetchWithErrorHandling(`/users?${params}`);

    // Ensure we always return an array
    if (result.error) {
      return [];
    }

    return result.data.users || result.data.data || [];
  }

  async getMentees(userId: string) {
    const result = await this.fetchWithErrorHandling(`/mentorships/mentees/${userId}`);

    // Return empty array on error
    if (result.error || result.status === 404) {
      return [];
    }

    return Array.isArray(result.data) ? result.data : [];
  }

  async getCommunications(params?: any) {
    const queryString = new URLSearchParams(params).toString();
    const result = await this.fetchWithErrorHandling(`/communications?${queryString}`);

    // Return empty structure on error
    if (result.error) {
      return { items: [], total: 0, page: 1, limit: params?.limit || 10 };
    }

    return result.data;
  }
}

export default new APIService();
```

---

## Fix 4.6: Add CSS for Role Badges

### File Location
`/frontend/styles/components.css` or similar

### Badge Styles

```css
/* Role and Referee Level Badges */
.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  margin: 0 4px;
}

.badge-referee-head {
  background-color: #8b0000;
  color: white;
}

.badge-referee-senior {
  background-color: #ff8c00;
  color: white;
}

.badge-referee-junior {
  background-color: #4169e1;
  color: white;
}

.badge-referee-rookie {
  background-color: #32cd32;
  color: white;
}

.badge-referee-coach {
  background-color: #9370db;
  color: white;
}

.badge-referee-base {
  background-color: #808080;
  color: white;
}

.badge-default {
  background-color: #e0e0e0;
  color: #333;
}

/* Error States */
.error-container {
  padding: 20px;
  text-align: center;
}

.error-message {
  color: #dc3545;
  margin-bottom: 10px;
}

.retry-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.retry-button:hover {
  background-color: #0056b3;
}

/* Empty States */
.empty-state {
  padding: 40px;
  text-align: center;
  color: #6c757d;
}

/* Loading States */
.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(0,0,0,.1);
  border-radius: 50%;
  border-top-color: #007bff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## Testing Frontend Updates

### Manual Testing Steps

1. **Test MenteeSelector Component**
   - Navigate to Games page
   - Should not see console errors
   - Should show "No mentees assigned" if none exist

2. **Test Referee List**
   - Navigate to Referees page
   - Should show empty state or referee list
   - No 500 errors in console

3. **Test Role Display**
   - Check user profiles show correct roles
   - Verify referee levels display properly
   - Confirm badges have correct colors

### Browser Console Checks

```javascript
// Run in browser console to verify no errors
console.clear();

// Check for any remaining errors after navigation
setTimeout(() => {
  const errors = console.error.toString();
  if (errors.includes('500') || errors.includes('undefined')) {
    console.log('❌ Still has errors');
  } else {
    console.log('✅ No critical errors');
  }
}, 3000);
```

---

## Expected Results

After implementing these frontend updates:

✅ MenteeSelector handles missing data gracefully
✅ No "undefined" errors from array access
✅ API errors return empty data instead of crashing
✅ Referee roles display correctly with badges
✅ Loading and error states properly shown
✅ All pages load without console errors

---

## Notes for Agent Implementation

1. **Test each component** after updating
2. **Check browser console** frequently
3. **Preserve existing functionality** while adding error handling
4. **Use TypeScript types** where applicable
5. **Keep UI responsive** during loading states