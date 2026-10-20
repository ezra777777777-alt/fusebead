"use client";

import { useEffect, useState } from "react";

export function isHostedCover(src: string) {
  try {
    const pathname = src.startsWith("http") ? new URL(src).pathname : src;
    return /\/projects\/covers\/[0-9a-f-]{36}\.jpg$/i.test(pathname.split("?")[0]);
  } catch {
    return false;
  }
}

export function AuthedCover({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;
    if (!isHostedCover(src)) {
      setUrl(src);
      return () => { cancelled = true; };
    }
    const token = localStorage.getItem("token");
    fetch(src, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (response) => {
        if (!response.ok) throw new Error("cover");
        objectUrl = URL.createObjectURL(await response.blob());
        if (!cancelled) setUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setUrl(""); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  if (!url) return <div className={`bg-black ${className || ""}`} role="img" aria-label={alt} />;
  return <img src={url} alt={alt} className={className} />;
}
