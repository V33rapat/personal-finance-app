import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

function getBackendURL() {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
}

async function getAuthHeader() {
  const token = (await cookies()).get('accessToken');
  
  if (!token) {
    return null;
  }

  return{
    Authorization: `Bearer ${token.value}`,
  };
}

export async function POST(request: NextRequest) {
  const authHeader = await getAuthHeader();

  if(!authHeader){
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json()

  const res = await fetch(`${getBackendURL()}/transaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ message: data.message }, { status: res.status });
  }

  return NextResponse.json(data, { status: res.status });
}