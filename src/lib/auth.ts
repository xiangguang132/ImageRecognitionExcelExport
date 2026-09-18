/**
 * JWT 鉴权工具库
 *
 * 提供 JWT 签发/验证、bcrypt 密码处理、从请求中解析当前用户等功能。
 */

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

const JWT_EXPIRES_IN = '24h'

export const AUTH_COOKIE_NAME = 'auth_token'

/**
 * 获取 JWT 密钥。未配置时直接抛错（fail fast），
 * 避免用硬编码 fallback 签发可被伪造的 Token。
 */
function requireSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('缺少 JWT_SECRET 环境变量，拒绝签发/验证 Token')
  }
  return secret
}

export interface JwtPayload {
  id: number
  email: string
  role: string
}

export interface AuthUser {
  id: number
  email: string
  name: string
  role: string
  mustChangePassword?: number
}

/**
 * 虚拟管理员：唯一管理员，仅由 .env 配置，不在 users 表中落盘。
 * 约定 id = 0，role = "admin"。
 */
export function getEnvAdmin(): AuthUser | null {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const name = process.env.ADMIN_NAME?.trim() || '系统管理员'
  if (!email) return null
  return { id: 0, email, name, role: 'admin', mustChangePassword: 0 }
}

export function getEnvAdminEmail(): string {
  return process.env.ADMIN_EMAIL?.toLowerCase().trim() || 'admin@system.local'
}

/**
 * 对明文密码做 bcrypt 哈希
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * 验证明文密码与 bcrypt 哈希是否匹配
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * 签发 JWT token
 */
export function generateToken(user: { id: number; email: string; role: string }): string {
  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role
  }
  return jwt.sign(payload, requireSecret(), { expiresIn: JWT_EXPIRES_IN })
}

/**
 * 验证并解码 JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, requireSecret()) as JwtPayload
  } catch {
    return null
  }
}

/**
 * 从 Cookie 头中提取指定 Cookie 的值
 */
function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(';')
  for (const cookie of cookies) {
    const idx = cookie.indexOf('=')
    if (idx === -1) continue
    const key = cookie.slice(0, idx).trim()
    if (key === name) {
      return decodeURIComponent(cookie.slice(idx + 1).trim())
    }
  }
  return null
}

/**
 * 从请求中提取 Bearer token（优先 httpOnly Cookie，其次 Authorization header 兼容旧客户端）
 */

/**
 * 当前请求是否为 HTTPS（nginx 经 X-Forwarded-Proto 透传）。
 * Cookie 的 Secure 标记必须与实际协议一致：http 下带 Secure 会被浏览器直接丢弃，
 * 导致登录后会话无法保持（本项目经 http://IP/card 访问，必须为 false）。
 */
export function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers.get('x-forwarded-proto')
  if (forwarded) return forwarded.split(',')[0].trim().toLowerCase() === 'https'
  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return false
  }
}

export function extractToken(request: Request): string | null {
  const fromCookie = getCookieValue(request.headers.get('cookie'), AUTH_COOKIE_NAME)
  if (fromCookie) return fromCookie

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  return null
}

/**
 * 从请求（httpOnly Cookie 优先，Authorization header 兼容）中提取并验证 token
 * 返回完整的用户信息（从数据库查询）或 null
 */
export async function getCurrentUser(request: Request): Promise<AuthUser | null> {
  const token = extractToken(request)
  if (!token) {
    return null
  }

  const payload = verifyToken(token)
  if (!payload) {
    return null
  }

  // 虚拟管理员（id = 0）：不查库，直接用 .env 构造，并校验邮箱一致防伪造
  if (payload.id === 0) {
    const admin = getEnvAdmin()
    if (!admin || payload.email.toLowerCase().trim() !== admin.email || payload.role !== 'admin') {
      return null
    }
    return admin
  }

  // 从数据库获取最新用户信息（确保角色未被篡改、账号未被删除）
  const user = await prisma.user.findFirst({
    where: { id: payload.id, isDel: 0 },
    select: { id: true, email: true, name: true, role: true, mustChangePassword: true }
  })

  // 邮箱可空（碰撞时可选择不填），对外统一为空字符串
  if (!user) return null
  return { ...user, email: user.email ?? '' } as AuthUser
}
