"use client";

import { Spinner } from "@heroui/react";

export function LoadingScreen() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Loading page">
      <Spinner size="lg" />
    </div>
  );
}
