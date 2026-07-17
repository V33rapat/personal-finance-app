"use client";

import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";

interface AvatarCropModalProps {
  imageSrc: string | null;
  isSaving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (area: Area) => void;
}

interface AvatarCropEditorProps extends Omit<AvatarCropModalProps, "imageSrc"> {
  imageSrc: string;
}

export default function AvatarCropModal({ imageSrc, ...props }: AvatarCropModalProps) {
  if (!imageSrc) return null;

  return <AvatarCropEditor key={imageSrc} imageSrc={imageSrc} {...props} />;
}

function AvatarCropEditor({
  imageSrc,
  isSaving,
  error,
  onCancel,
  onConfirm,
}: AvatarCropEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {TH_TEXT.profile.cropTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {TH_TEXT.profile.cropDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={TH_TEXT.common.close}
            disabled={isSaving}
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        <div className="relative mt-5 h-72 overflow-hidden rounded-xl bg-slate-950 sm:h-80">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, croppedAreaPixels) => setArea(croppedAreaPixels)}
          />
        </div>

        <label className="mt-5 block text-sm text-slate-600 dark:text-slate-300">
          {TH_TEXT.profile.zoom}
          <input
            className="mt-2 w-full accent-violet-600"
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            disabled={isSaving}
          />
        </label>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel} disabled={isSaving}>
            {TH_TEXT.profile.cancel}
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => area && onConfirm(area)}
            disabled={isSaving || !area}
          >
            {isSaving ? TH_TEXT.profile.avatarUploading : TH_TEXT.profile.cropConfirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
