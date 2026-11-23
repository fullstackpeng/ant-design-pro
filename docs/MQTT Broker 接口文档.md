# **Mosquitto Dynamic Security 接口文档**

适用环境：**Mosquitto 2.1.4 + Dynamic Security Plugin**

你目前已经完成 Broker 部署、管理员认证、动态创建用户以及 ACL 发布/订阅验证。

以下是可以直接用于 Java、Android、C++、Python、Go 等语言的 MQTT 管理接口协议。

## **1. 接口基本信息**

| 参数       | 值                                       |
| -------- | --------------------------------------- |
| 协议       | MQTT 3.1.1 / MQTT 5.0                   |
| Broker   | `127.0.0.1`（远程使用服务器 IP）                 |
| 端口       | `1883`                                  |
| 管理账号     | `admin`                                 |
| 请求 Topic | `$CONTROL/dynamic-security/v1`          |
| 响应 Topic | `$CONTROL/dynamic-security/v1/response` |
| Payload  | UTF-8 JSON                              |
| 推荐 QoS   | 1                                       |

**调用流程：**

1. 使用 `admin` 账号连接 MQTT Broker。
2. 订阅响应 Topic。
3. 向请求 Topic 发布 JSON 管理命令。
4. 解析响应 JSON 中的 `responses` 数组，判断执行结果。

## **2. 通用请求格式**

```
{
  "commands": [
    {
      "command": "listClients"
    }
  ]
}
```

支持一次提交多个命令：

```
{
  "commands": [
    {"command": "listClients"},
    {"command": "listRoles"},
    {"command": "listGroups"}
  ]
}
```

通用响应结构：

```
{
  "responses": [
    {
      "command": "listClients",
      "data": {
        "clients": [
          {"username": "admin"},
          {"username": "device001"}
        ]
      }
    }
  ]
}
```

失败响应通常包含 `error` 字段。业务程序应检查每个响应项，而不只是 MQTT 消息是否发送成功。

## **3. 用户管理接口**

### **3.1 创建用户&#x20;**`createClient`

可以在创建用户时直接绑定已有角色 `device_role`。

```
{
  "commands": [
    {
      "command": "createClient",
      "username": "device002",
      "password": "StrongPassword123!",
      "roles": [
        {
          "rolename": "device_role",
          "priority": 0
        }
      ]
    }
  ]
}
```

### **3.2 删除用户&#x20;**`deleteClient`

```
{
  "commands": [
    {
      "command": "deleteClient",
      "username": "device002"
    }
  ]
}
```

### **3.3 修改密码&#x20;**`setClientPassword`

```
{
  "commands": [
    {
      "command": "setClientPassword",
      "username": "device001",
      "password": "NewStrongPassword123!"
    }
  ]
}
```

### **3.4 禁用用户&#x20;**`disableClient`

```
{
  "commands": [
    {
      "command": "disableClient",
      "username": "device001"
    }
  ]
}
```

### **3.5 启用用户&#x20;**`enableClient`

```
{
  "commands": [
    {
      "command": "enableClient",
      "username": "device001"
    }
  ]
}
```

### **3.6 查询用户&#x20;**`getClient`

```
{
  "commands": [
    {
      "command": "getClient",
      "username": "device001"
    }
  ]
}
```

### **3.7 查询用户列表&#x20;**`listClients`

支持分页。

```
{
  "commands": [
    {
      "command": "listClients",
      "verbose": false,
      "count": 20,
      "offset": 0
    }
  ]
}
```

### **3.8 绑定角色&#x20;**`addClientRole`

```
{
  "commands": [
    {
      "command": "addClientRole",
      "username": "device001",
      "rolename": "device_role",
      "priority": 0
    }
  ]
}
```

### **3.9 移除角色&#x20;**`removeClientRole`

```
{
  "commands": [
    {
      "command": "removeClientRole",
      "username": "device001",
      "rolename": "device_role"
    }
  ]
}
```

## **4. 角色管理接口**

| command         | 功能        | 必需字段                                    |
| --------------- | --------- | --------------------------------------- |
| `createRole`    | 创建角色      | `rolename`                              |
| `deleteRole`    | 删除角色      | `rolename`                              |
| `getRole`       | 查询角色详情    | `rolename`                              |
| `listRoles`     | 查询角色列表    | 无                                       |
| `addRoleACL`    | 添加 ACL 权限 | `rolename`, `acltype`, `topic`, `allow` |
| `removeRoleACL` | 删除 ACL 权限 | `rolename`, `acltype`, `topic`          |

### **4.1 创建角色并配置权限**

```
{
  "commands": [
    {
      "command": "createRole",
      "rolename": "sensor_role",
      "acls": [
        {
          "acltype": "publishClientSend",
          "topic": "sensor/#",
          "allow": true,
          "priority": 0
        },
        {
          "acltype": "subscribePattern",
          "topic": "sensor/#",
          "allow": true,
          "priority": 0
        }
      ]
    }
  ]
}
```

### **4.2 为角色添加发布权限**

```
{
  "commands": [
    {
      "command": "addRoleACL",
      "rolename": "device_role",
      "acltype": "publishClientSend",
      "topic": "test/#",
      "allow": true,
      "priority": 0
    }
  ]
}
```

### **4.3 为角色添加订阅权限**

```
{
  "commands": [
    {
      "command": "addRoleACL",
      "rolename": "device_role",
      "acltype": "subscribePattern",
      "topic": "test/#",
      "allow": true,
      "priority": 0
    }
  ]
}
```

### **4.4 移除 ACL**

```
{
  "commands": [
    {
      "command": "removeRoleACL",
      "rolename": "device_role",
      "acltype": "subscribeLiteral",
      "topic": "test/#"
    }
  ]
}
```

这个例子可以删除你之前添加的、不需要的 `subscribeLiteral` 规则。

## **5. ACL 类型说明**

| acltype                | 作用                    |
| ---------------------- | --------------------- |
| `publishClientSend`    | 控制客户端能否向某个 Topic 发布消息 |
| `publishClientReceive` | 控制客户端能否接收某个 Topic 的消息 |
| `subscribeLiteral`     | 精确匹配客户端提交的订阅过滤器       |
| `subscribePattern`     | 按主题模式匹配客户端的订阅过滤器      |
| `unsubscribeLiteral`   | 精确匹配取消订阅的过滤器          |
| `unsubscribePattern`   | 按模式匹配取消订阅的过滤器         |

注意：允许订阅不一定代表允许接收消息。实际授权还可能受到 `publishClientReceive` 规则影响。

## **6. 用户组管理接口**

适用于需要批量分配角色的场景。

| command             | 功能       |
| ------------------- | -------- |
| `createGroup`       | 创建用户组    |
| `deleteGroup`       | 删除用户组    |
| `getGroup`          | 查询用户组    |
| `listGroups`        | 查询用户组列表  |
| `addGroupClient`    | 将用户加入用户组 |
| `removeGroupClient` | 从用户组移除用户 |
| `addGroupRole`      | 为用户组绑定角色 |
| `removeGroupRole`   | 移除用户组角色  |

例如，将 `device001` 加入 `sensors` 用户组：

```
{
  "commands": [
    {
      "command": "addGroupClient",
      "groupname": "sensors",
      "username": "device001",
      "priority": 0
    }
  ]
}
```

## **7. 错误处理**

成功响应示例：

```
{
  "responses": [
    {
      "command": "createClient"
    }
  ]
}
```

失败响应示例：

```
{
  "responses": [
    {
      "command": "createClient",
      "error": "Client already exists"
    }
  ]
}
```

`error` 的具体文本可能随命令和版本变化，建议按字段是否存在判断成功或失败。

**特别注意：** 该协议没有通用请求 ID 字段。多个请求共用同一个管理员连接时，响应可能难以对应。建议使用独立管理连接或串行发送命令，并设置超时。

## **8. 安全与工程注意事项**

- **管理接口不是 HTTP API**，而是 MQTT Topic API。
- 管理员账号仅用于安全管理，不建议提供给 Android 或其他终端设备。
- 生产环境建议使用 TLS（通常为 8883 端口），避免密码及管理命令明文传输。
- 建议为每个设备分配独立账号及最小 ACL 权限。
- 修改密码、禁用用户后，应考虑现有 MQTT 会话的状态和重新认证行为。
- 你之前的测试密码 `123456` 强度较低，正式使用前建议修改。
- 不建议直接编辑 `dynamic-security.json`，应通过管理命令更新。

## **9. 官方接口文档**

完整字段、可选参数和其他命令，以官方文档为准：

- [Mosquitto Dynamic Security 官方说明](https://mosquitto.org/documentation/dynamic-security/?utm_source=chatgpt.com)
- [Dynamic Security JSON API 命令参考](https://github.com/eclipse-mosquitto/mosquitto/blob/master/plugins/dynamic-security/README.md?utm_source=chatgpt.com)

以上 JSON 命令可以直接作为各语言 MQTT SDK 的 Payload 使用，无需依赖 `mosquitto_ctrl.exe`。

[image](https://www.google.com/s2/favicons?domain=https://mosquitto.org\&sz=32)

Eclipse Mosquitto+1
