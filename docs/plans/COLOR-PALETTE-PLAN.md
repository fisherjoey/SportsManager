# SyncedSport Color Palette Implementation Plan

## 🎨 Core Palette - Based on Teal Brand Icon

### Primary Colors
- **Brand Teal**: `#20B2AA` (HSL: 173, 80%, 40%)
  - Primary buttons, links, active states
  - Logo color match, navigation highlights
- **Brand Teal Dark**: `#0D7377` (HSL: 173, 80%, 25%)
  - Hover states, pressed buttons
  - Dark mode accents
- **Brand Teal Light**: `#B8F2EF` (HSL: 173, 80%, 90%)
  - Light backgrounds, subtle highlights
  - Active navigation backgrounds

### Semantic Colors
- **Success**: `#10B981` (Green - HSL: 160, 84%, 39%)
- **Warning**: `#F59E0B` (Orange - HSL: 43, 96%, 50%)
- **Error**: `#EF4444` (Red - HSL: 0, 84%, 60%)
- **Info**: `#06B6D4` (Cyan - HSL: 189, 95%, 43%)

### Neutral Scale
- **Gray 50**: `#F9FAFB` - Page backgrounds
- **Gray 100**: `#F3F4F6` - Card backgrounds (light)
- **Gray 200**: `#E5E7EB` - Borders, dividers
- **Gray 300**: `#D1D5DB` - Input borders
- **Gray 400**: `#9CA3AF` - Placeholder text, disabled icons
- **Gray 500**: `#6B7280` - Secondary text
- **Gray 600**: `#4B5563` - Body text
- **Gray 700**: `#374151` - Headings
- **Gray 800**: `#1F2937` - Dark surfaces
- **Gray 900**: `#111827` - High contrast text

### Dark Mode
- **Background**: `#0F172A` - Main app background
- **Surface**: `#1E293B` - Cards, modals
- **Surface Light**: `#334155` - Hover states
- **Border**: `#475569` - Dividers

## 📋 Implementation Phases

### Phase 1: Core CSS Variables (Priority: High)
- [ ] Update all CSS custom properties in `globals.css`
- [ ] Create comprehensive color token system
- [ ] Add accessibility-compliant contrast ratios
- [ ] Test light/dark mode switching

### Phase 2: Component System (Priority: High)
- [ ] Update all hardcoded colors in components
- [ ] Standardize icon colors across the app
- [ ] Update button variants and states
- [ ] Ensure sidebar matches new palette

### Phase 3: Semantic Applications (Priority: Medium)
- [ ] Apply success/warning/error colors consistently
- [ ] Update chart colors for better contrast
- [ ] Standardize form input styling
- [ ] Update table and list styling

### Phase 4: Accessibility Validation (Priority: High)
- [ ] Test all text/background combinations for WCAG AA compliance
- [ ] Verify color-blind friendly palette
- [ ] Test in various lighting conditions
- [ ] Validate focus states and interactive elements

## 🎯 Color Usage Guidelines

### Icons
- **Primary Icons**: Use `text-gray-600` (light) / `text-gray-300` (dark)
- **Active Icons**: Use `text-primary` 
- **Semantic Icons**: Use corresponding semantic color
- **Sidebar Icons**: Use `text-sidebar-foreground`

### Text Hierarchy
- **H1/H2**: `text-gray-900` (light) / `text-gray-100` (dark)
- **H3/H4**: `text-gray-700` (light) / `text-gray-200` (dark)
- **Body**: `text-gray-600` (light) / `text-gray-300` (dark)
- **Muted**: `text-gray-500` (light) / `text-gray-400` (dark)

### Interactive Elements
- **Primary Button**: `bg-primary text-primary-foreground`
- **Secondary Button**: `bg-secondary text-secondary-foreground`
- **Hover States**: Darken by 10% in light mode, lighten by 10% in dark mode
- **Focus Ring**: Use `ring-primary` with `ring-2`

### Backgrounds
- **Page**: `bg-background`
- **Cards**: `bg-card`
- **Sidebar**: `bg-sidebar-background`
- **Overlays**: `bg-background/80` (with opacity)

## 🧪 Testing Checklist

- [ ] All text passes WCAG AA (4.5:1 contrast ratio)
- [ ] Large text passes WCAG AA (3:1 contrast ratio)
- [ ] Interactive elements have clear focus states
- [ ] Colors are distinguishable for color-blind users
- [ ] Dark mode maintains same accessibility standards
- [ ] Brand colors are consistent across all components