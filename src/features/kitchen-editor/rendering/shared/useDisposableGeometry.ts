"use client";

import { useEffect } from "react";
import type { BufferGeometry } from "three";

export function useDisposableGeometry(geometry: BufferGeometry): void {
  useEffect(() => () => {
    geometry.dispose();
  }, [geometry]);
}
