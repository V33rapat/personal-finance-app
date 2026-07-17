export function toProfileResponse(data: unknown) {
  const profile = data as {
    fullName?: unknown;
    email?: unknown;
    avatarUrl?: unknown;
  } | null;

  return {
    fullName: typeof profile?.fullName === 'string' ? profile.fullName : '',
    email: typeof profile?.email === 'string' ? profile.email : '',
    avatarUrl: typeof profile?.avatarUrl === 'string' ? profile.avatarUrl : null,
  };
}
