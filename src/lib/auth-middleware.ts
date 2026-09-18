/**
 * API 路由认证中间件（高阶函数）
 *
 * 用法：
 *   export const GET = withAuth(async (request, user) => { ... })
 *   export const POST = withAdmin(async (request, user) => { ... })
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, AuthUser } from './auth'

type AuthenticatedHandler = (
  request: NextRequest,
  user: AuthUser
) => Promise<NextResponse | Response>

type RouteContext = { params: Promise<{ id: string }> }

type AuthenticatedHandlerWithParams = (
  request: NextRequest,
  context: RouteContext,
  user: AuthUser
) => Promise<NextResponse | Response>

/**
 * 强制改密拦截：mustChangePassword = 1 的账号只能调改密/查自己/退出，
 * 其他接口一律 403（前端跳转拦不住直接调接口的情况）。
 * 管理员为虚拟账号（flag 恒为 0），不受影响。
 */
const PASSWORD_CHANGE_ALLOWLIST = [
  '/api/auth/change-password',
  '/api/auth/me',
  '/api/auth/logout'
]

function passwordChangeGuard(request: NextRequest, user: AuthUser): NextResponse | null {
  if (user.mustChangePassword === 1 && !PASSWORD_CHANGE_ALLOWLIST.includes(request.nextUrl.pathname)) {
    return NextResponse.json(
      { error: '请先修改初始密码', mustChangePassword: 1 },
      { status: 403 }
    )
  }
  return null
}

/**
 * 要求用户已登录（任意角色）
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse | Response> => {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: '未登录或登录已过期' },
        { status: 401 }
      )
    }
    const blocked = passwordChangeGuard(request, user)
    if (blocked) return blocked
    return handler(request, user)
  }
}

/**
 * 要求管理员角色
 */
export function withAdmin(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse | Response> => {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: '未登录或登录已过期' },
        { status: 401 }
      )
    }
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: '权限不足，需要管理员权限' },
        { status: 403 }
      )
    }
    const blocked = passwordChangeGuard(request, user)
    if (blocked) return blocked
    return handler(request, user)
  }
}

/**
 * 要求已登录 + 带路由参数（如 [id]）
 */
export function withAuthParams(handler: AuthenticatedHandlerWithParams) {
  return async (request: NextRequest, context: RouteContext): Promise<NextResponse | Response> => {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: '未登录或登录已过期' },
        { status: 401 }
      )
    }
    const blocked = passwordChangeGuard(request, user)
    if (blocked) return blocked
    return handler(request, context, user)
  }
}

/**
 * 要求管理员 + 带路由参数
 */
export function withAdminParams(handler: AuthenticatedHandlerWithParams) {
  return async (request: NextRequest, context: RouteContext): Promise<NextResponse | Response> => {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: '未登录或登录已过期' },
        { status: 401 }
      )
    }
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: '权限不足，需要管理员权限' },
        { status: 403 }
      )
    }
    const blocked = passwordChangeGuard(request, user)
    if (blocked) return blocked
    return handler(request, context, user)
  }
}
