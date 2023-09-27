# webRTC
webrtc 实现的 p2p 信道

- 能获取所有在线设备列表
- 随机连接至四个设备, 且按效率扩展收缩
- 将数据拆解同时向多台设备分发, 对端接收后再次分发
- 需要确保全部设备获得全部数据, 每台设备至少一半不重复
- 五色
- 单向链
- 固定填位(矩阵)
- [a1, b1, c1, d1, e1]
-         [a2, b2, c2, d2, e2]
-                 [a3, b3, c3, d3, e3]
