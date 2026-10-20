"use client";

import { ViaProvider } from "@via-ds/components/provider";

export function Providers({ children }) {
  return <ViaProvider colorScheme="light">{children}</ViaProvider>;
}
