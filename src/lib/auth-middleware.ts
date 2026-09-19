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
    return handler(request, user)
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
    return handler(request, context, user)
  }
}
