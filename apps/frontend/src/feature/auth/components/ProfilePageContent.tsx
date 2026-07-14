"use client";

import { useState } from "react";
import type { Area } from "react-easy-crop";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import { TH_TEXT } from "@/constants/th";
import LogoutButton from "@/feature/auth/components/LogoutButton";
import AvatarCropModal from "@/feature/auth/components/AvatarCropModal";
import ProfileAvatar from "@/feature/auth/components/ProfileAvatar";
import { createAvatarFile } from "@/feature/auth/lib/cropImage";
import { useProfile } from "@/feature/auth/hooks/useProfile";

export default function ProfilePageContent() {
  const {
    profile,
    isLoading,
    isSaving,
    isAvatarSaving,
    error,
    saveError,
    avatarError,
    clearSaveError,
    clearAvatarError,
    loadProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
  } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [fullNameInput, setFullNameInput] = useState("");
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const closeCrop = () => {
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource(null);
    setCropError(null);
    clearAvatarError();
  };

  const handleFileSelected = (file: File) => {
    clearAvatarError();
    setCropError(null);

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setCropError(TH_TEXT.profile.avatarTypeError);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setCropError(TH_TEXT.profile.avatarSizeError);
      return;
    }

    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource(URL.createObjectURL(file));
  };

  const handleCropConfirm = async (area: Area) => {
    if (!cropSource) return;

    setCropError(null);

    try {
      const file = await createAvatarFile(cropSource, area);
      const updatedProfile = await uploadAvatar(file);

      if (updatedProfile) closeCrop();
    } catch (cropFailure) {
      setCropError(cropFailure instanceof Error ? cropFailure.message : TH_TEXT.profile.avatarUploadFailed);
    }
  };

  const handleDeleteAvatar = async () => {
    const updatedProfile = await deleteAvatar();
    if (updatedProfile) setIsDeleteDialogOpen(false);
  };

  const handleEdit = () => {
    if (!profile) return;

    setFullNameInput(profile.fullName);
    clearSaveError();
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFullNameInput(profile?.fullName ?? "");
    clearSaveError();
    setIsEditing(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const updatedProfile = await updateProfile(fullNameInput);

    if (updatedProfile) {
      setFullNameInput(updatedProfile.fullName);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          {TH_TEXT.profile.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {TH_TEXT.profile.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {TH_TEXT.profile.subtitle}
        </p>
      </header>

      <Card className="p-6">
        {isLoading ? (
          <div className="flex animate-pulse items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-3">
              <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
            <Button variant="secondary" onClick={() => void loadProfile()}>
              {TH_TEXT.profile.retry}
            </Button>
          </div>
        ) : profile ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <ProfileAvatar
                  fullName={profile.fullName}
                  avatarUrl={profile.avatarUrl}
                  isBusy={isAvatarSaving}
                  onFileSelected={handleFileSelected}
                  onDeleteRequest={() => setIsDeleteDialogOpen(true)}
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    {TH_TEXT.profile.fullName}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">
                    {profile.fullName}
                  </h2>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                    {TH_TEXT.profile.email}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {profile.email}
                  </p>
                </div>
              </div>

              {!isEditing && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button variant="secondary" onClick={handleEdit}>
                    {TH_TEXT.profile.editProfile}
                  </Button>
                  <LogoutButton />
                </div>
              )}
            </div>

            {(avatarError || (!cropSource && cropError)) && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {avatarError ?? cropError}
              </p>
            )}

            {isEditing && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <FormField
                  label={TH_TEXT.profile.fullName}
                  id="profile-full-name"
                  value={fullNameInput}
                  onChange={(event) => setFullNameInput(event.target.value)}
                  error={saveError ?? undefined}
                  disabled={isSaving}
                  autoFocus
                />

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? TH_TEXT.profile.saving : TH_TEXT.profile.save}
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleCancel} disabled={isSaving}>
                    {TH_TEXT.profile.cancel}
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </Card>

      <AvatarCropModal
        imageSrc={cropSource}
        isSaving={isAvatarSaving}
        error={cropError ?? avatarError}
        onCancel={closeCrop}
        onConfirm={(area) => void handleCropConfirm(area)}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title={TH_TEXT.profile.deleteAvatarConfirmTitle}
        message={TH_TEXT.profile.deleteAvatarConfirmMessage}
        confirmText={isAvatarSaving ? TH_TEXT.profile.avatarUploading : TH_TEXT.common.delete}
        onConfirm={() => void handleDeleteAvatar()}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
}
