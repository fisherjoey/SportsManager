/**
 * Animation Utility Library
 *
 * Comprehensive animation variants for framer-motion and general use.
 * Designed for 60fps performance and respects prefers-reduced-motion.
 */

// Type definitions for animation variants (compatible with framer-motion)
export type Transition = {
  duration?: number;
  delay?: number;
  ease?: readonly number[] | number[] | string;
  type?: 'tween' | 'spring' | 'inertia';
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
  restSpeed?: number;
  restDelta?: number;
  staggerChildren?: number;
  delayChildren?: number;
  staggerDirection?: number;
  when?: 'beforeChildren' | 'afterChildren';
  repeat?: number;
  repeatType?: 'loop' | 'reverse' | 'mirror';
  repeatDelay?: number;
};

export type VariantValue = {
  opacity?: number | number[];
  x?: number | string;
  y?: number | string;
  scale?: number;
  rotate?: number | number[];
  transition?: Transition;
  backgroundPosition?: string | string[];
  [key: string]: any;
};

export type Variants = {
  [key: string]: VariantValue;
};

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

export const easings = {
  // Standard Material Design easings
  standard: [0.4, 0.0, 0.2, 1] as const,
  decelerate: [0.0, 0.0, 0.2, 1] as const,
  accelerate: [0.4, 0.0, 1, 1] as const,

  // Custom easings
  smooth: [0.4, 0.0, 0.2, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
  bounce: [0.68, -0.55, 0.265, 1.55] as const,

  // Natural feeling easings
  easeInOut: [0.645, 0.045, 0.355, 1] as const,
  easeOut: [0.075, 0.82, 0.165, 1] as const,
  easeIn: [0.95, 0.05, 0.795, 0.035] as const,
};

// ============================================================================
// TIMING CONSTANTS
// ============================================================================

export const durations = {
  instant: 0,
  fast: 0.15,
  normal: 0.2,
  medium: 0.3,
  slow: 0.4,
  slower: 0.6,
} as const;

// ============================================================================
// BASE TRANSITIONS
// ============================================================================

export const transitions = {
  default: {
    duration: durations.normal,
    ease: easings.smooth,
  } as Transition,

  fast: {
    duration: durations.fast,
    ease: easings.smooth,
  } as Transition,

  medium: {
    duration: durations.medium,
    ease: easings.smooth,
  } as Transition,

  slow: {
    duration: durations.slow,
    ease: easings.smooth,
  } as Transition,

  spring: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  } as Transition,

  springBouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 25,
  } as Transition,

  springGentle: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 35,
  } as Transition,
};

// ============================================================================
// FADE VARIANTS
// ============================================================================

export const fadeVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: transitions.default,
  },
  exit: {
    opacity: 0,
    transition: transitions.fast,
  },
};

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.default,
  },
};

export const fadeOutVariants: Variants = {
  visible: { opacity: 1 },
  hidden: {
    opacity: 0,
    transition: transitions.default,
  },
};

// ============================================================================
// SLIDE VARIANTS
// ============================================================================

export const slideUpVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitions.medium,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: transitions.fast,
  },
};

export const slideDownVariants: Variants = {
  initial: {
    opacity: 0,
    y: -10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitions.medium,
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: transitions.fast,
  },
};

export const slideLeftVariants: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: transitions.medium,
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: transitions.fast,
  },
};

export const slideRightVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: transitions.medium,
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: transitions.fast,
  },
};

// ============================================================================
// SCALE VARIANTS
// ============================================================================

export const scaleInVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: transitions.default,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: transitions.fast,
  },
};

export const scaleOutVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 1.05,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: transitions.default,
  },
  exit: {
    opacity: 0,
    scale: 1.05,
    transition: transitions.fast,
  },
};

export const popInVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: transitions.springBouncy,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: transitions.fast,
  },
};

// ============================================================================
// STAGGER VARIANTS
// ============================================================================

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.medium,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: transitions.fast,
  },
};

// Fast stagger for quick lists
export const staggerContainerFastVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

// Slow stagger for emphasis
export const staggerContainerSlowVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.075,
      staggerDirection: -1,
    },
  },
};

// ============================================================================
// CARD VARIANTS
// ============================================================================

export const cardHoverVariants: Variants = {
  initial: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: transitions.fast,
  },
  tap: {
    scale: 0.98,
    transition: transitions.fast,
  },
};

export const cardRevealVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.medium,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: transitions.fast,
  },
};

// ============================================================================
// MODAL/DIALOG VARIANTS
// ============================================================================

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.default,
  },
  exit: {
    opacity: 0,
    transition: transitions.fast,
  },
};

export const modalContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...transitions.medium,
      delay: 0.05,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: transitions.fast,
  },
};

export const drawerVariants: Variants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: '100%',
    transition: transitions.medium,
  },
};

export const drawerLeftVariants: Variants = {
  hidden: { x: '-100%' },
  visible: {
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: '-100%',
    transition: transitions.medium,
  },
};

// ============================================================================
// LIST VARIANTS
// ============================================================================

export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      staggerChildren: 0.08,
    },
  },
};

export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.default,
  },
};

export const gridContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      staggerChildren: 0.05,
    },
  },
};

export const gridItemVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.default,
  },
};

// ============================================================================
// NOTIFICATION/TOAST VARIANTS
// ============================================================================

export const toastVariants: Variants = {
  initial: {
    opacity: 0,
    y: -20,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.spring,
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: transitions.fast,
  },
};

export const notificationSlideVariants: Variants = {
  initial: {
    opacity: 0,
    x: 100,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: transitions.medium,
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: transitions.fast,
  },
};

// ============================================================================
// LOADING VARIANTS
// ============================================================================

export const pulseVariants: Variants = {
  animate: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const shimmerVariants: Variants = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ============================================================================
// SKELETON LOADING VARIANTS
// ============================================================================

export const skeletonPulseVariants: Variants = {
  animate: {
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================================================
// PAGE TRANSITION VARIANTS
// ============================================================================

export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.medium,
      ease: easings.smooth,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: durations.fast,
      ease: easings.smooth,
    },
  },
};

export const pageSlideVariants: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: transitions.medium,
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: transitions.fast,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a custom stagger container with configurable delay
 */
export const createStaggerContainer = (
  staggerDelay: number = 0.1,
  delayChildren: number = 0
): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: staggerDelay / 2,
      staggerDirection: -1,
    },
  },
});

/**
 * Create custom slide variants with configurable distance
 */
export const createSlideVariants = (
  direction: 'up' | 'down' | 'left' | 'right',
  distance: number = 20
): Variants => {
  const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
  const initialValue =
    direction === 'up' || direction === 'left' ? distance : -distance;

  return {
    initial: {
      opacity: 0,
      [axis]: initialValue,
    },
    animate: {
      opacity: 1,
      [axis]: 0,
      transition: transitions.medium,
    },
    exit: {
      opacity: 0,
      [axis]: -initialValue,
      transition: transitions.fast,
    },
  };
};

/**
 * Create custom scale variants
 */
export const createScaleVariants = (
  initialScale: number = 0.95,
  withOpacity: boolean = true
): Variants => ({
  initial: {
    ...(withOpacity && { opacity: 0 }),
    scale: initialScale,
  },
  animate: {
    ...(withOpacity && { opacity: 1 }),
    scale: 1,
    transition: transitions.default,
  },
  exit: {
    ...(withOpacity && { opacity: 0 }),
    scale: initialScale,
    transition: transitions.fast,
  },
});

/**
 * Detect if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get transition with reduced motion support
 */
export const getTransition = (transition: Transition): Transition => {
  if (prefersReducedMotion()) {
    return {
      duration: 0.01,
    };
  }
  return transition;
};

/**
 * Get variants with reduced motion support
 */
export const getVariants = (variants: Variants): Variants => {
  if (!prefersReducedMotion()) {
    return variants;
  }

  // Simplify all variants to instant transitions
  const reducedVariants: Variants = {};
  for (const [key, value] of Object.entries(variants)) {
    if (typeof value === 'object' && value !== null) {
      reducedVariants[key] = {
        ...value,
        transition: { duration: 0.01 },
      };
    }
  }
  return reducedVariants;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Easings
  easings,
  durations,
  transitions,

  // Basic animations
  fadeVariants,
  fadeInVariants,
  fadeOutVariants,
  slideUpVariants,
  slideDownVariants,
  slideLeftVariants,
  slideRightVariants,
  scaleInVariants,
  scaleOutVariants,
  popInVariants,

  // Stagger animations
  staggerContainerVariants,
  staggerItemVariants,
  staggerContainerFastVariants,
  staggerContainerSlowVariants,

  // Component animations
  cardHoverVariants,
  cardRevealVariants,
  modalBackdropVariants,
  modalContentVariants,
  drawerVariants,
  drawerLeftVariants,

  // List animations
  listContainerVariants,
  listItemVariants,
  gridContainerVariants,
  gridItemVariants,

  // Notification animations
  toastVariants,
  notificationSlideVariants,

  // Loading animations
  pulseVariants,
  spinnerVariants,
  shimmerVariants,
  skeletonPulseVariants,

  // Page transitions
  pageVariants,
  pageSlideVariants,

  // Utilities
  createStaggerContainer,
  createSlideVariants,
  createScaleVariants,
  prefersReducedMotion,
  getTransition,
  getVariants,
};
