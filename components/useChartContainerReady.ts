import { useEffect, useRef, useState } from 'react';

const hasSize = (element: HTMLDivElement) => {
  const { width, height } = element.getBoundingClientRect();
  return width > 0 && height > 0;
};

const useChartContainerReady = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(true);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const syncReadyState = () => {
      if (hasSize(element)) {
        setIsReady(true);
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

  return { containerRef, isReady };
};

export default useChartContainerReady;
