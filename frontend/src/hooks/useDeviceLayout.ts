import { useEffect, useState } from 'react';

export type DeviceLayout = 'mobile' | 'desktop';

function detectLayout(): DeviceLayout {
  if (typeof window === 'undefined') return 'desktop';
  const isMobileWidth = window.matchMedia('(max-width: 1023px)').matches;
  const isAndroid = /android/i.test(navigator.userAgent);
  return isMobileWidth || isAndroid ? 'mobile' : 'desktop';
}

export function useDeviceLayout(): DeviceLayout {
  const [layout, setLayout] = useState<DeviceLayout>(detectLayout);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setLayout(detectLayout());
    mq.addEventListener('change', onChange);
    window.addEventListener('resize', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);

  return layout;
}
