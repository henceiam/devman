import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

interface AppChromeState {
  headerHidden: boolean;
}

interface AppChromeContextValue extends AppChromeState {
  setRequest: (requestId: symbol, state: AppChromeState | null) => void;
}

const AppChromeContext = createContext<AppChromeContextValue | null>(null);

export function AppChromeProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<Map<symbol, AppChromeState>>(new Map());

  const setRequest = useCallback((requestId: symbol, state: AppChromeState | null) => {
    setRequests((current) => {
      const next = new Map(current);
      if (state) next.set(requestId, state);
      else next.delete(requestId);
      return next;
    });
  }, []);

  const value = useMemo<AppChromeContextValue>(() => ({
    headerHidden: Array.from(requests.values()).some((request) => request.headerHidden),
    setRequest,
  }), [requests, setRequest]);

  return <AppChromeContext.Provider value={value}>{children}</AppChromeContext.Provider>;
}

export function useAppChromeState() {
  const context = useContext(AppChromeContext);
  if (!context) throw new Error("useAppChromeState must be used within AppChromeProvider");
  return { headerHidden: context.headerHidden };
}

export function useAppChrome(state: AppChromeState) {
  const context = useContext(AppChromeContext);
  const requestId = useRef(Symbol("app-chrome-request"));

  if (!context) throw new Error("useAppChrome must be used within AppChromeProvider");

  const { setRequest } = context;
  useLayoutEffect(() => {
    setRequest(requestId.current, state);
    return () => setRequest(requestId.current, null);
  }, [setRequest, state.headerHidden]);
}
