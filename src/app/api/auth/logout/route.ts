import { NextResponse } from 'next/server'

// POST - 退出登录（清除 httpOnly Cookie）
export async function POST() {
  const response = NextResponse.json({ message: '已退出登录' })
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production'
  })
  return response
}
