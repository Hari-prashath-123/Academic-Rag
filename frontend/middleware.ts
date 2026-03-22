import { NextRequest, NextResponse } from 'next/server'

type AuthRole = 'admin' | 'faculty' | 'student' | 'advisor'

function decodeRolesFromJwt(token: string): string[] {
  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart) {
      return []
    }
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const payload = JSON.parse(atob(padded))
    return Array.isArray(payload.roles) ? payload.roles : []
  } catch {
    return []
  }
}

function resolveRole(roles: string[]): AuthRole | null {
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('faculty')) return 'faculty'
  if (roles.includes('advisor')) return 'advisor'
  if (roles.includes('student')) return 'student'
  return null
}

const routeAccess: Record<string, AuthRole[]> = {
  '/users': ['admin'],
  '/mapping': ['admin', 'faculty'],
  '/materials': ['admin', 'faculty', 'advisor', 'student'],
  '/courses': ['admin', 'faculty', 'advisor'],
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  const matchedRoute = Object.keys(routeAccess).find((route) => pathname.startsWith(route))
  if (!matchedRoute) {
    return NextResponse.next()
  }

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const role = resolveRole(decodeRolesFromJwt(token))
  if (!role) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const allowedRoles = routeAccess[matchedRoute]
  if (!allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/users/:path*', '/mapping/:path*', '/materials/:path*'],
}
