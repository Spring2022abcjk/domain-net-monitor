Cloudflare Worker 域名网络特性监控项目需求（Wrangler 工程化版）
 
一、项目概述
 
基于 Cloudflare Worker + Wrangler 工程化开发，实现域名网络特性自动化监控。通过外部 DoH 服务查询 DNS，检测目标域名的 HTTPS RR 记录、ECH 支持、IPv6 服务能力；依托 CF KV 持久化域名列表与检测结果，对外提供标准化 HTTP JSON 接口，支持域名管理、单/批量检测、结果查询。
 
二、硬性约束
 
1. 技术形态：标准 Wrangler 工程，采用 ES Module 语法，纯原生 JavaScript，不引入任何第三方 NPM 依赖。
2. DNS 查询：所有 DNS 请求强制使用外部 DoH 服务，主节点  https://cloudflare-dns.com/dns-query ，备用节点  https://dns.google/resolve ，主节点异常自动切换备用节点。
3. 执行策略：检测任务串行执行，适配 Cloudflare Worker CPU 时长限制。
4. 运行载体：最终部署至 Cloudflare Worker，兼容 Worker 运行时规则。
 
三、项目目录结构
 
plaintext
  
{项目仓库名}/
├── wrangler.toml       # 工程核心配置、KV绑定、运行参数
└── src/
    ├── config.js       # 全局常量定义
    ├── utils/
    │   └── helper.js   # 通用工具函数
    ├── doh/
    │   └── client.js   # DoH 请求封装
    ├── detectors/     # 三大指标检测逻辑
    │   ├── https-rr.js
    │   ├── ech.js
    │   ├── ipv6.js
    │   └── index.js   # 检测方法聚合导出
    ├── storage/
    │   └── kv.js      # KV 数据读写封装
    ├── routes/         # 接口路由分发
    │   ├── domains.js
    │   ├── detect.js
    │   ├── result.js
    │   └── index.js   # 路由聚合导出
    └── index.js        # Worker 入口主文件
 
 
四、模块职责说明
 
1. config.js：统一管理 DoH 地址、DNS 类型码、请求超时、状态枚举、KV 键名、跨域请求头。
2. utils/helper.js：实现域名清洗、带超时的  fetch  封装、统一 JSON 响应构造、OPTIONS 跨域预检处理。
3. doh/client.js：封装主备双节点 DoH 查询逻辑，接收域名与 DNS 类型，返回 DoH 原始 JSON 数据。
4. detectors 目录
-  https-rr.js ：检测 DNS HTTPS RR（TYPE 65）记录；
-  ech.js ：结合 DNS 配置 + 443 端口 TLS 握手，检测 ECH 支持；
-  ipv6.js ：结合 AAAA 记录（TYPE 28）+ IPv6 端口连通性，检测 IPv6 服务；
-  index.js ：聚合所有检测方法，提供单域名全量检测入口。
5. storage/kv.js：封装 KV 读写方法，实现域名列表、检测结果的持久化存取。
6. routes 目录：按业务拆分接口逻辑，分别处理域名管理、检测任务、结果查询， index.js  统一聚合路由。
7. src/index.js：Worker 入口，解析请求路径、请求方法与请求体，分发至对应路由，全局捕获异常。
8. wrangler.toml：配置 Worker 名称、兼容日期、端口，绑定 KV Namespace。
 
五、核心检测规则
 
1. 统一状态枚举
 
-  ok ：完全支持/记录正常
-  partial ：部分支持/配置异常/连通失败
-  no ：无对应记录/不支持
-  error ：查询超时/网络异常/域名非法
 
2. HTTPS RR 记录检测（TYPE 65）
 
1. 流程：调用 DoH 查询域名 TYPE 65 记录；
2. 判定：
-  ok ：DoH 返回有效 Answer 数组，存在合法 HTTPS RR 记录；
-  no ：无 Answer 或 DNS 状态码非 0；
-  error ：主备 DoH 均请求失败。
 
3. ECH 能力检测
 
1. 流程：先通过 DoH 查询 HTTPS RR，判断是否包含 ECH 配置；再向域名 443 端口发起 TLS 探测；
2. 判定：
-  ok ：存在 ECH 配置 + 443 端口握手正常；
-  partial ：存在 ECH 配置，但端口拦截/握手失败；
-  no ：HTTPS RR 中无 ECH 相关配置；
-  error ：DoH 查询失败。
 
4. IPv6 服务检测
 
1. 流程：DoH 查询 AAAA 记录（TYPE 28），提取 IPv6 地址后探测  [IPv6]:443  连通性；
2. 判定：
-  ok ：存在 AAAA 记录 + IPv6 端口访问正常；
-  partial ：存在 AAAA 记录，但 IPv6 端口无法连通；
-  no ：无 AAAA 记录；
-  error ：DoH 查询失败。
 
六、KV 存储规范
 
绑定 KV 命名空间  DOMAIN_MONITOR_KV ，数据格式：
 
1. 域名列表
- Key： domain_list 
- Value：JSON 字符串数组，例  ["a.com","b.com"] 
2. 单域名检测结果
- Key 规则： result:{域名} 
- Value：JSON 对象，包含  domain 、 timestamp 、 https_rr 、 ech 、 ipv6  字段。
 
七、HTTP 接口规范
 
所有接口统一返回  Content-Type: application/json ，基础格式  {"code": 状态码, "data": 数据, "msg": 描述} ；全局支持跨域，处理 OPTIONS 预检请求。
 
1. 域名管理接口
 
1. 获取域名列表
- 路径： /api/domains 
- 方法： GET 
2. 全量更新域名列表
- 路径： /api/domains 
- 方法： POST 
- 请求体： {"domains": ["域名1","域名2"]} 
3. 追加单个域名
- 路径： /api/domains/add 
- 方法： POST 
- 请求体： {"domain": "目标域名"} 
4. 删除单个域名
- 路径： /api/domains/delete 
- 方法： POST 
- 请求体： {"domain": "目标域名"} 
 
2. 检测接口
 
1. 批量检测全部域名
- 路径： /api/detect/all 
- 方法： GET/POST 
2. 单域名检测
- 路径： /api/detect/single 
- 方法： POST 
- 请求体： {"domain": "目标域名"} 
 
3. 结果查询接口
 
1. 查询全部域名最新结果
- 路径： /api/result/all 
- 方法： GET 
2. 查询单域名最新结果
- 路径： /api/result/single 
- 方法： POST 
- 请求体： {"domain": "目标域名"} 
 
八、通用规则
 
1. 域名预处理：自动剔除  http/https  协议、端口、URL 路径，清洗为纯域名；空/非法域名直接拦截并返回参数错误。
2. 超时控制：所有外部请求（DoH、站点探测）统一超时 5000ms。
3. 异常处理：请求体非合法 JSON、路由不存在、服务内部错误，均返回对应错误码与描述。
 
九、配置与部署要求
 
1.  wrangler.toml ：配置 Worker 名称、兼容日期、本地调试端口，正确填写绑定的 KV Namespace ID。
2. 部署：使用  wrangler deploy  发布至 Cloudflare Worker；本地调试使用  wrangler dev ；线上排错使用  wrangler tail  查看实时日志。
