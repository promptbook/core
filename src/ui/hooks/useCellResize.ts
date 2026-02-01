import { useState, useEffect, useRef, useCallback } from 'react';

const MIN_HEIGHT = 100;
const DEFAULT_HEIGHT = 150;

interface UseCellResizeOptions {
  initialHeight?: number;
  onHeightChange: (height: number) => void;
}

export function useCellResize({ initialHeight, onHeightChange }: UseCellResizeOptions) {
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const contentHeight = initialHeight || DEFAULT_HEIGHT;

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = initialHeight || DEFAULT_HEIGHT;
  }, [initialHeight]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startYRef.current;
      const newHeight = Math.max(MIN_HEIGHT, startHeightRef.current + deltaY);
      onHeightChange(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onHeightChange]);

  return {
    isResizing,
    contentHeight,
    handleResizeStart,
  };
}
