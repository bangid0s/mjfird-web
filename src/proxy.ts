import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type SupabaseClient = ReturnType<typeof createServerClient>;

async function isAdmin(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("is_admin");
  // PGRST202 = the function doesn't exist yet, i.e. 0027 hasn't been applied.
  // Before that migration there is no public sign-up, so every account is the
  // owner's. Any other error fails closed.
  if (error) return error.code === "PGRST202";
  return data === true;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith("/admin");

  // Client-only pages: send signed-out visitors to the client login.
  const isClientRoute = path.startsWith("/account") || /^\/services\/[^/]+\/request$/.test(path);
  if (isClientRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const isLoginRoute = request.nextUrl.pathname === "/admin/login";

  if (isAdminRoute && !isLoginRoute && !user) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Signed in is no longer enough: client accounts exist alongside the
  // owner's, so the admin needs an entry in the `admins` table
  // (0027_admin_role.sql). RLS enforces the same rule on every write.
  const admin = user && isAdminRoute ? await isAdmin(supabase) : false;

  if (isAdminRoute && !isLoginRoute && user && !admin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isLoginRoute && user && admin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  // Also runs on client pages so their session cookie is refreshed.
  matcher: ["/admin/:path*", "/account/:path*", "/services/:slug/request", "/login", "/signup", "/auth/:path*"],
};
