"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { TH_TEXT } from "@/constants/th";

interface ProfileAvatarProps {
  fullName: string;
  avatarUrl: string | null;
  isBusy: boolean;
  onFileSelected: (file: File) => void;
  onDeleteRequest: () => void;
}

function getInitials(fullName: string) {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "U";
}

export default function ProfileAvatar({
  fullName,
  avatarUrl,
  isBusy,
  onFileSelected,
  onDeleteRequest,
}: ProfileAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  const openFilePicker = () => {
    setIsMenuOpen(false);
    inputRef.current?.click();
  };

  return (
    <div className="relative shrink-0">
      <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-violet-50 text-xl font-bold text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/60">
        {avatarUrl && failedAvatarUrl !== avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={fullName}
            fill
            unoptimized
            sizes="80px"
            className="object-cover"
            onError={() => setFailedAvatarUrl(avatarUrl)}
          />
        ) : (
          getInitials(fullName)
        )}
      </div>

      <button
        type="button"
        className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-violet-600 text-white shadow-md transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-slate-900"
        onClick={() => setIsMenuOpen((open) => !open)}
        disabled={isBusy}
        aria-label={TH_TEXT.profile.avatarMenu}
        aria-expanded={isMenuOpen}
        title={TH_TEXT.profile.avatarMenu}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 8.25h3l1.5-2.25h6l1.5 2.25h3A1.5 1.5 0 0 1 21 9.75v8.25a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V9.75a1.5 1.5 0 0 1 1.5-1.5Z" />
          <circle cx="12" cy="14" r="3.25" />
        </svg>
      </button>

      {isMenuOpen && (
        <div className="absolute left-0 top-24 z-10 min-w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={openFilePicker}
          >
            <span aria-hidden>↗</span>
            {avatarUrl ? TH_TEXT.profile.changeAvatar : TH_TEXT.profile.chooseAvatar}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={() => {
              setIsMenuOpen(false);
              onDeleteRequest();
            }}
            disabled={!avatarUrl || isBusy}
          >
            <span aria-hidden>×</span>
            {TH_TEXT.profile.deleteAvatar}
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFileSelected(file);
        }}
      />
    </div>
  );
}
