interface ApiRouter {
  push: (href: string) => void;
}

interface ApiErrorResponse {
  message?: string;
}

export async function readApiResponse<T>(
  response: Response,
  router?: ApiRouter
): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | ApiErrorResponse
    | T
    | null;

  if (response.status === 401) {
    router?.push("/login");
    throw new Error((data as ApiErrorResponse | null)?.message ?? "Unauthorized");
  }

  if (!response.ok) {
    throw new Error((data as ApiErrorResponse | null)?.message ?? "Request failed");
  }

  return data as T;
}
