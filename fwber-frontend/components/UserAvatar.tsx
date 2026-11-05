"use client";

import { useState } from "react";
import Image from "next/image";
import { getAvatarUrl } from "@/lib/utils/avatar";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  userId?: string | number | null;
  size?: number;
  className?: string;
  fill?: boolean;
  priority?: boolean;
}

/**
 * Consistent avatar display across the app.
 * Falls back to a DiceBear-generated avatar when no photo is uploaded
 * or when the photo fails to load (e.g. legacy URLs pointing to dead hosts).
 */
export default function UserAvatar({
  src,
  name,
  userId,
  size = 40,
  className = "",
  fill = false,
  priority = false,
}: UserAvatarProps) {
  const seed = name || userId || "user";
  const [imgSrc, setImgSrc] = useState(() => getAvatarUrl(src, seed));

  const handleError = () => {
    const fallback = getAvatarUrl(null, seed);
    if (imgSrc !== fallback) setImgSrc(fallback);
  };

  if (fill) {
    return (
      <Image
        src={imgSrc}
        alt={name || "User"}
        fill
        className={`object-cover ${className}`}
        priority={priority}
        onError={handleError}
      />
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={name || "User"}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      priority={priority}
      onError={handleError}
    />
  );
}
