/**
 * JWT 鉴权工具库
 *
 * 提供 JWT 签发/验证、bcrypt 密码处理、从请求中解析当前用户等功能。
 */

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me'
const JWT_EXPIRES_IN = '24h'

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * 验证并解码 JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

/**
 * 从 Authorization header 中提取 Bearer token 并验证
 * 返回完整的用户信息（从数据库查询）或 null
 */
export async function getCurrentUser(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  const payload = verifyToken(token)
  if (!payload) {
    return null
  }

  // 从数据库获取最新用户信息（确保角色未被篡改、账号未被删除）
  const user = await prisma.user.findFirst({
    where: { id: payload.id, isDel: 0 },
    select: { id: true, email: true, name: true, role: true }
  })

  return user as AuthUser | null
}
