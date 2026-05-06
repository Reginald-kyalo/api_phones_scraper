import { useEffect, useState, useRef } from 'react';

interface UseScrollHideOptions {
  hideThreshold?: number; // pixels scrolled down before hiding header
}

/**
 * Hook for hide-on-scroll-down, show-on-scroll-up header behavior
 * Tracks scroll direction and position to manage header visibility
 * Shows header IMMEDIATELY when scrolling up, hides after hideThreshold pixels down
 */
export function useScrollHideHeader(options: UseScrollHideOptions = {}) {
  const { hideThreshold = 30 } = options;
  
  const [isVisible, setIsVisible] = useState(true);
  const prevScrollPosRef = useRef(window.scrollY);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      const prevScrollPos = prevScrollPosRef.current;

      // Scrolling up - show header IMMEDIATELY
      if (currentScrollPos < prevScrollPos) {
        setIsVisible(true);
      }
      // Scrolling down past threshold - hide header
      else if (currentScrollPos > prevScrollPos + hideThreshold) {
        setIsVisible(false);
      }

      prevScrollPosRef.current = currentScrollPos;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hideThreshold]);

  return { isVisible };
}
