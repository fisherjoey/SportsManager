# Animation Utilities Usage Guide

This guide demonstrates how to use the comprehensive animation utilities in the SportsManager frontend.

## Table of Contents

1. [Tailwind CSS Animations](#tailwind-css-animations)
2. [CSS Utility Classes](#css-utility-classes)
3. [Framer Motion Variants](#framer-motion-variants)
4. [Accessibility](#accessibility)

---

## Tailwind CSS Animations

All animation classes are available as Tailwind utilities and can be used directly in your JSX/TSX files.

### Basic Animations

```tsx
// Fade animations
<div className="animate-fade-in">Fades in smoothly</div>
<div className="animate-fade-out">Fades out smoothly</div>

// Slide animations
<div className="animate-slide-up">Slides up from below</div>
<div className="animate-slide-down">Slides down from above</div>

// Scale animation
<div className="animate-scale-in">Scales in from 95% to 100%</div>
```

### Loading States

```tsx
// Shimmer effect for skeleton loaders
<div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] h-20 rounded">
  Loading...
</div>

// Subtle pulse
<div className="animate-pulse-subtle">Gently pulsing content</div>

// Subtle bounce
<div className="animate-bounce-subtle">Subtly bouncing element</div>
```

### Example: Card with Animations

```tsx
function AnimatedCard({ children }) {
  return (
    <div className="animate-scale-in hover-lift hover-glow transition-smooth bg-white p-6 rounded-lg shadow-md">
      {children}
    </div>
  );
}
```

---

## CSS Utility Classes

### Transition Utilities

```tsx
// Smooth transition (200ms cubic-bezier)
<button className="transition-smooth bg-blue-500 hover:bg-blue-600">
  Smooth Button
</button>

// Spring transition (300ms with bounce)
<div className="transition-spring hover:scale-105">
  Bouncy element
</div>
```

### Hover Effects

```tsx
// Lift effect on hover
<div className="hover-lift cursor-pointer">
  Lifts up slightly on hover
</div>

// Glow effect on hover
<div className="hover-glow cursor-pointer">
  Shows a subtle glow shadow on hover
</div>

// Combined effects
<div className="hover-lift hover-glow transition-smooth">
  Lifts and glows on hover
</div>
```

### Example: Interactive Card List

```tsx
function CardList({ items }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item, index) => (
        <div
          key={index}
          className="animate-fade-in hover-lift hover-glow transition-smooth bg-white p-4 rounded-lg shadow"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
```

---

## Framer Motion Variants

Import the animation library to use pre-built motion variants:

```tsx
import { motion } from 'framer-motion';
import {
  fadeVariants,
  slideUpVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/animations';
```

### Basic Fade Animation

```tsx
function FadeInComponent() {
  return (
    <motion.div
      variants={fadeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      Content that fades in
    </motion.div>
  );
}
```

### Staggered List Animation

```tsx
import { motion } from 'framer-motion';
import { staggerContainerVariants, staggerItemVariants } from '@/lib/animations';

function StaggeredList({ items }) {
  return (
    <motion.ul
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-2"
    >
      {items.map((item, index) => (
        <motion.li
          key={index}
          variants={staggerItemVariants}
          className="bg-white p-4 rounded-lg shadow"
        >
          {item.name}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

### Card with Hover Animation

```tsx
import { motion } from 'framer-motion';
import { cardHoverVariants, cardRevealVariants } from '@/lib/animations';

function AnimatedCard({ title, content }) {
  return (
    <motion.div
      variants={cardRevealVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover="hover"
      whileTap="tap"
      className="bg-white p-6 rounded-lg shadow-lg"
    >
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-2 text-gray-600">{content}</p>
    </motion.div>
  );
}
```

### Modal/Dialog Animation

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { modalBackdropVariants, modalContentVariants } from '@/lib/animations';

function Modal({ isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal Content */}
          <motion.div
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full pointer-events-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Page Transitions

```tsx
import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/animations';

function PageWrapper({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
```

### Custom Variants with Utilities

```tsx
import { createStaggerContainer, createSlideVariants } from '@/lib/animations';

// Create custom stagger with 150ms delay
const customStagger = createStaggerContainer(0.15, 0.05);

// Create custom slide right animation with 30px distance
const slideRight = createSlideVariants('right', 30);

function CustomAnimatedList() {
  return (
    <motion.div variants={customStagger} initial="hidden" animate="visible">
      {items.map(item => (
        <motion.div key={item.id} variants={slideRight}>
          {item.content}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

### Loading Skeleton

```tsx
import { motion } from 'framer-motion';
import { skeletonPulseVariants } from '@/lib/animations';

function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <motion.div
        variants={skeletonPulseVariants}
        animate="animate"
        className="h-8 bg-gray-200 rounded"
      />
      <motion.div
        variants={skeletonPulseVariants}
        animate="animate"
        className="h-20 bg-gray-200 rounded"
      />
      <motion.div
        variants={skeletonPulseVariants}
        animate="animate"
        className="h-8 bg-gray-200 rounded w-3/4"
      />
    </div>
  );
}
```

### Toast Notification

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { toastVariants } from '@/lib/animations';

function Toast({ message, isVisible }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={toastVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## Accessibility

All animations respect the `prefers-reduced-motion` media query for accessibility.

### Automatic Handling

The CSS utilities automatically reduce animations for users who prefer reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Manual Handling in JavaScript

```tsx
import { prefersReducedMotion, getVariants } from '@/lib/animations';

function ResponsiveAnimation() {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      variants={getVariants(fadeVariants)}
      initial="initial"
      animate="animate"
    >
      Content with accessibility-aware animations
    </motion.div>
  );
}
```

---

## Performance Best Practices

1. **Use GPU-accelerated properties**: Prefer `transform` and `opacity` over `width`, `height`, `top`, `left`
2. **Avoid animating many elements simultaneously**: Use stagger animations with reasonable delays
3. **Test on lower-end devices**: Ensure animations maintain 60fps
4. **Use `will-change` sparingly**: Only when necessary for complex animations
5. **Prefer CSS animations for simple effects**: They're more performant than JavaScript animations

### Example: Optimized Card Grid

```tsx
function OptimizedCardGrid({ items }) {
  return (
    <motion.div
      variants={gridContainerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-3 gap-4"
    >
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          variants={gridItemVariants}
          className="bg-white p-4 rounded-lg shadow hover-lift transition-smooth"
        >
          {item.content}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

---

## Available Variants

### Basic Animations
- `fadeVariants`, `fadeInVariants`, `fadeOutVariants`
- `slideUpVariants`, `slideDownVariants`, `slideLeftVariants`, `slideRightVariants`
- `scaleInVariants`, `scaleOutVariants`, `popInVariants`

### Component Animations
- `cardHoverVariants`, `cardRevealVariants`
- `modalBackdropVariants`, `modalContentVariants`
- `drawerVariants`, `drawerLeftVariants`

### List Animations
- `staggerContainerVariants`, `staggerItemVariants`
- `staggerContainerFastVariants`, `staggerContainerSlowVariants`
- `listContainerVariants`, `listItemVariants`
- `gridContainerVariants`, `gridItemVariants`

### Loading Animations
- `pulseVariants`, `spinnerVariants`, `shimmerVariants`
- `skeletonPulseVariants`

### Notification Animations
- `toastVariants`, `notificationSlideVariants`

### Page Transitions
- `pageVariants`, `pageSlideVariants`

---

## Easing and Timing

All animations use carefully tuned easing curves and durations:

```tsx
import { easings, durations, transitions } from '@/lib/animations';

// Available easings
easings.smooth      // [0.4, 0, 0.2, 1] - Default smooth easing
easings.spring      // [0.34, 1.56, 0.64, 1] - Bouncy spring
easings.easeInOut   // [0.645, 0.045, 0.355, 1] - Natural ease in-out

// Available durations
durations.fast      // 0.15s
durations.normal    // 0.2s
durations.medium    // 0.3s
durations.slow      // 0.4s

// Pre-configured transitions
transitions.default  // Default smooth transition
transitions.spring   // Spring physics
transitions.fast     // Quick transition
```

---

## Testing

A test file is available at `__tests__/animations-test.html` to verify all animations work correctly and maintain 60fps performance.

To test:
1. Open the test file in a browser
2. Verify all animations play smoothly
3. Enable "Reduce motion" in system settings and reload
4. Verify animations are instant/minimal
