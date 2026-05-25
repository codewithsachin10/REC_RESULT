import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname;
  
  // Protect /faculty/dashboard
  if (path.startsWith('/faculty/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/faculty/login'
      return NextResponse.redirect(url)
    }
    
    // Strict edge authorization for faculty routes
    if (user.user_metadata?.role !== 'faculty') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard' // Send students back to their dashboard
      return NextResponse.redirect(url)
    }
  }

  // Protect student /dashboard
  if (path.startsWith('/dashboard') && !path.startsWith('/faculty/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Redirect faculty to their own dashboard if they hit the student route
    if (user.user_metadata?.role === 'faculty') {
      const url = request.nextUrl.clone()
      url.pathname = '/faculty/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
