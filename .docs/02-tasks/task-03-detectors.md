# 任务 3：检测模块实现

## 任务目标

实现三大域名网络特性检测器，提供单域名全量检测能力。

---

## 子任务列表

### 3.1 实现 detectors/https-rr.js

#### 3.1.1 检测函数 `detectHttpsRR(domain)`

功能：
- 调用 DoH 查询域名 TYPE 65（HTTPS RR）记录
- 分析响应中的 Answer 数组

判定规则：
| 状态 | 条件 |
|------|------|
| `ok` | DoH 返回有效 Answer 数组，存在合法 HTTPS RR 记录 |
| `no` | 无 Answer 或 DNS 状态码非 0 |
| `error` | 主备 DoH 均请求失败 |

返回值：
```javascript
{
  status: "ok" | "no" | "error",
  message: "描述信息"
}
```

### 3.2 实现 detectors/ipv6.js

#### 3.2.1 检测函数 `detectIpv6(domain)`

功能：
- 调用 DoH 查询域名 TYPE 28（AAAA）记录
- 提取 IPv6 地址
- 探测 `[IPv6]:443` 连通性（仅检查是否有 AAAA 记录）

判定规则：
| 状态 | 条件 |
|------|------|
| `ok` | 存在 AAAA 记录 |
| `no` | 无 AAAA 记录 |
| `error` | DoH 查询失败 |

**注意**：受限于 Worker 运行环境，IPv6 端口连通性探测简化为仅检查 AAAA 记录存在性。

返回值：
```javascript
{
  status: "ok" | "no" | "error",
  message: "描述信息",
  ipv6Addresses: [...] // 可选：解析到的 IPv6 地址列表
}
```

### 3.3 实现 detectors/ech.js

#### 3.3.1 检测函数 `detectEch(domain)`

功能：
- 调用 DoH 查询 HTTPS RR 记录
- 检查 HTTPS RR 中是否包含 ECH 配置
- 在 Worker 环境中简化为仅检查 DNS 层面的 ECH 配置

判定规则：
| 状态 | 条件 |
|------|------|
| `ok` | HTTPS RR 中存在 ECH 配置 |
| `no` | HTTPS RR 中无 ECH 配置 |
| `error` | DoH 查询失败 |

**注意**：受限于 Worker 运行环境，TLS 握手探测简化为仅检查 DNS 配置。

返回值：
```javascript
{
  status: "ok" | "no" | "error",
  message: "描述信息"
}
```

### 3.4 实现 detectors/index.js

#### 3.4.1 聚合导出

导入并导出所有检测器：
```javascript
import { detectHttpsRR } from './https-rr.js';
import { detectEch } from './ech.js';
import { detectIpv6 } from './ipv6.js';

export { detectHttpsRR, detectEch, detectIpv6 };
```

#### 3.4.2 单域名全量检测函数 `detectAll(domain)`

功能：
- 接收单个域名（已清洗）
- 串行执行三大检测（适配 CPU 时长限制）
- 整合所有检测结果

执行顺序：
1. HTTPS RR 检测
2. ECH 检测
3. IPv6 检测

返回值：
```javascript
{
  domain: "example.com",
  timestamp: 1234567890,
  https_rr: { status: "ok", message: "..." },
  ech: { status: "ok", message: "..." },
  ipv6: { status: "ok", message: "..." }
}
```

---

## 验收标准

1. 三个检测器均能独立工作，返回正确状态
2. `detectAll()` 能串行执行所有检测并整合结果
3. 所有检测器在 DoH 失败时返回 `error` 状态
4. 检测结果格式符合统一规范

---

## 前置依赖

- 任务 1：项目初始化与配置
- 任务 2：工具层实现

## 后续依赖

- 任务 5：路由层实现
- 任务 6：入口与集成
