import { NextRequest, NextResponse } from 'next/server'
import { isSecureRequest } from '@/lib/auth'

// POST - 退出登录（清除 httpOnly Cookie）
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: '已退出登录' })
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    secure: isSecureRequest(request)
  })
  return response
}
