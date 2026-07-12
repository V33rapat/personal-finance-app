import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/app/api/_lib/bff";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${getBackendUrl()}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.message }, { status: res.status });
    }

    return NextResponse.json(data, { status: res.status });
      
  } catch {
    return NextResponse.json(
      { message: "เซิร์ฟเวอร์ไม่พร้อมใช้งาน" },
      { status: 500 }
    );
  }
}
