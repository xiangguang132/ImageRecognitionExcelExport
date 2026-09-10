# 数据库建表语句

## 创建数据库

```sql
CREATE DATABASE IF NOT EXISTS student_card DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 使用数据库

```sql
USE student_card;
```

## 创建学生证信息表

```sql
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(50) COMMENT '学号（只保留数字和大写字母）',
  name VARCHAR(100) COMMENT '姓名',
  email VARCHAR(100) COMMENT '邮箱',
  major VARCHAR(100) COMMENT '专业',
  role VARCHAR(50) COMMENT '角色（如 學生/STUDENT）',
  interest_direction VARCHAR(100) COMMENT '未来兴趣方向（项目/研究，可多选，逗号分隔）',
  interest_topic VARCHAR(500) COMMENT '意向参与主题',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生证信息表';
```

## 连接信息

请修改项目根目录 `.env` 文件中的数据库连接信息：

```
DATABASE_URL="mysql://用户名:密码@localhost:3306/student_card"
```

默认配置：用户名 `root`，密码需替换为你实际的 MySQL 密码。
