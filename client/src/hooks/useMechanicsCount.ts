import { useState, useEffect } from 'react';

// Global state for mechanics count to ensure consistency across components
let globalMechanicsCount = 0;
let globalUpdateTime = 0;
const listeners: Set<() => void> = new Set();

// Generate a consistent random count that stays the same for a period
const generateMechanicsCount = (): number => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  // Only regenerate if more than 5 minutes have passed
  if (now - globalUpdateTime > fiveMinutes || globalMechanicsCount === 0) {
    globalMechanicsCount = Math.floor(Math.random() * 5) + 8; // 8-12 mechanics
    globalUpdateTime = now;
    
    // Notify all listeners
    listeners.forEach(listener => listener());
  }
  
  return globalMechanicsCount;
};

// Custom hook to get current mechanics count
export const useMechanicsCount = () => {
  const [count, setCount] = useState(() => generateMechanicsCount());

  useEffect(() => {
    const updateCount = () => {
      setCount(generateMechanicsCount());
    };

    // Add this component as a listener
    listeners.add(updateCount);
    
    // Set up interval to check for updates every minute
    const interval = setInterval(updateCount, 60 * 1000);

    // Cleanup
    return () => {
      listeners.delete(updateCount);
      clearInterval(interval);
    };
  }, []);

  return count;
};