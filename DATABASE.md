# 数据库说明（SQLite 单表）

## 连接信息

`DATABASE_URL="file:./dev.db"`（`.env`），文件位置 `prisma/dev.db`
（相对 `prisma/` 目录解析）。

## 设计约定

- **单表 `users`**：学生档案 + 登录账号一体，不再有 `students` 表。
- **管理员是虚拟账号**：仅由 `.env` 配置
  （`ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME`），不在 `users` 表中落盘，
  登录与鉴权时在内存中构造（`id = 0, role = "admin"`）。
- **学生账号**：`role` 恒为 `"user"`；在校身份（学生/教师）存 `identity` 列。
- **登录分离**：学生用**学号**登录（`POST /api/auth/login`，页面 `/login`）；
  管理员用**邮箱**登录（`POST /api/auth/admin-login`，页面 `/admin/login`）。
- **默认密码**：管理员导入/录入学生时密码为 `123456`（bcrypt 入库），
  `must_change_password = 1`，学生首次登录必须强制改密。
- **邮箱规则（甲方固定）**：默认 `学号去尾 + @connect.um.edu.mo`
  （如 `AC201301 → ac20130@…`）。末位不同的学号会生成同一邮箱，
  碰撞时录入弹窗二选一：**不填邮箱入库**（`email` 为空，学号登录不受影响）
  或 **在 @ 前追加随机字母**（如 `ac20130x@…`）；也可手工修改为真实邮箱。

## 表结构（`users`）

| 列 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 自增 |
| email | TEXT UNIQUE，可空 | 邮箱（碰撞时可空；学生登录键是学号） |
| student_id | TEXT UNIQUE，可空 | 学号（学生登录键） |
| name | TEXT | 姓名 |
| password | TEXT | bcrypt hash |
| role | TEXT | 权限，DB 中恒为 `user` |
| major | TEXT，可空 | 专业 |
| identity | TEXT，可空 | 在校身份：`student` / `teacher` |
| interest_direction | TEXT，可空 | 未来兴趣方向（项目/研究） |
| interest_topic | TEXT，可空 | 意向参与主题 |
| must_change_password | INTEGER | 1=下次登录强制改密 |
| is_del | INTEGER | 软删除：0-未删除 1-已删除 |
| created_at / updated_at | DATETIME | 时间戳 |

## 常用命令

```bash
npx prisma db push        # 同步表结构（SQLite 无 migrate 目录）
npx prisma db seed        # 环境自检（虚拟管理员就绪 + 清理残留 admin 行）
npx tsx prisma/seed-test-data.ts  # 生成 25 条测试学生账号（密码 123456）
```
