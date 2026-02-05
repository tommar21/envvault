"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

/**
 * Hook for copying text to clipboard with visual feedback.
 */
export function useCopyToClipboard(resetDelay = 2000) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = useCallback(
    (text: string, id: string) => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedId(id);
          toast.success("Copied to clipboard");
          setTimeout(() => setCopiedId(null), resetDelay);
        })
        .catch(() => toast.error("Failed to copy to clipboard"));
    },
    [resetDelay]
  );

  const isCopied = useCallback((id: string) => copiedId === id, [copiedId]);

  return {
    copiedId,
    copy,
    isCopied,
  };
}
