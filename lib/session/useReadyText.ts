"use client";

import { useEffect, useState } from "react";

/** A saved text field. Anything typed before saved work has loaded is kept, not overwritten. */
export function useReadyText(ready: boolean, value: string, set: (v: string) => void): [string, (v: string) => void] {
  const [early, setEarly] = useState<string | null>(null);
  useEffect(() => {
    if (!ready || early === null) return;
    set(early);
    setEarly(null);
    // set only writes to a store; early and ready decide when
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, early]);
  return [early ?? value, ready && early === null ? set : setEarly];
}
