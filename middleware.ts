import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const id = request.cookies.get("sudomeet_id")?.value;
  const name = request.cookies.get("sudomeet_name")?.value;

  // If both cookies exist and id looks like UUID, pass through
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (id && uuidRe.test(id) && name) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const newId = id && uuidRe.test(id) ? id : crypto.randomUUID();
  const displayName = name ? decodeURIComponent(name) : `Guest-${newId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

  if (!id || !uuidRe.test(id)) {
    res.cookies.set("sudomeet_id", newId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    });
  }
  if (!name) {
    res.cookies.set("sudomeet_name", encodeURIComponent(displayName), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
