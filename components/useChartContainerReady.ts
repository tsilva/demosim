import { useEffect, useRef, useState } from 'react';

const getElementSize = (element: HTMLDivElement) => {
  const { width, height } = element.getBoundingClientRect();
  return {
    width: Math.floor(width),
    height: Math.floor(height),
  };
};

const useChartContainerReady = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const syncReadyState = () => {
      const nextDimensions = getElementSize(element);
      if (nextDimensions.width > 0 && nextDimensions.height > 0) {
        setDimensions((currentDimensions) => (
          currentDimensions.width === nextDimensions.width && currentDimensions.height === nextDimensions.height
            ? currentDimensions
            : nextDimensions
        ));
        setIsReady(true);
      } else {
        setIsReady(false);
      }
    };

    syncReadyState();

    const frameId = window.requestAnimationFrame(syncReadyState);
    const resizeObserver = new ResizeObserver(syncReadyState);
    resizeObserver.observe(element);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, []);

  return { containerRef, isReady, dimensions };
};

export default useChartContainerReady;
