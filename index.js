import express from 'express'
import expressWs from 'express-ws'
import turn from 'node-turn'
import { exec } from 'child_process'

// 创建 TURN 服务器
const turnServer = new turn({
    authMech: 'long-term',
    credentials: {
        username: 'your-username',
        password: 'your-password',
    },
    debugLevel: 'ALL',
    listeningIps: [''],
    listeningPort: 3478,
    relayIps: [''],
    relayPort: 3478,
    verbose: true
})

// 启动 TURN 服务器
turnServer.start(() => {
    console.log('TURN server start:', turnServer)
})

const app = express()
const wsInstance = expressWs(app)
app.use(express.static('public'))
app.use(express.json())
app.use((req, res, next) => {
    if (req.method === 'CONNECT') {
        turnServer.handleConnect(req, res)
    } else {
        next()
    }
})

// Websocket 处理 webRTC 信令
app.ws('/webrtc/:channel', (ws, req) => {
    ws.id = req.headers['sec-websocket-key']
    ws.channel = req.params.channel
    ws.name = req.query.name
    console.log('ws.name:', ws.name)
    // 设备离开频道时广播给所有在线设备
    ws.on('close', () => {
        console.log(ws.id, '设备离开频道:', ws.channel, wsInstance.getWss().clients.size)
        wsInstance.getWss().clients.forEach(client => {
            if (client !== ws && client.readyState === 1 && client.channel === ws.channel) {
                client.send(JSON.stringify({ type: 'pull', id: ws.id, channel: ws.channel }))
            }
        })
    })
    // 设备发生错误时广播给所有在线设备
    ws.on('error', () => {
        console.log(ws.id, '设备发生错误:', ws.channel, wsInstance.getWss().clients.size)
        wsInstance.getWss().clients.forEach(client => {
            if (client !== ws && client.readyState === 1 && client.channel === ws.channel) {
                client.send(JSON.stringify({ type: 'error', id: ws.id, channel: ws.channel }))
            }
        })
    })
    // 设备发送信令时转发给指定在线设备
    ws.on('message', message => {
        console.log(ws.id, '设备发送信令:', ws.channel, wsInstance.getWss().clients.size)
        const data = JSON.parse(message)
        wsInstance.getWss().clients.forEach(client => {
            if (client !== ws && client.readyState === 1 && client.channel === ws.channel && client.id === data.id) {
                client.send(JSON.stringify({ ...data, id: ws.id, name: ws.name }))
            }
        })
    })
    // 设备加入频道时广播给所有在线设备(也获取所有在线设备)
    console.log(ws.id, '设备加入频道:', ws.channel, wsInstance.getWss().clients.size)
    wsInstance.getWss().clients.forEach(client => {
        if (client !== ws && client.readyState === 1 && client.channel === ws.channel) {
            console.log(ws.name, '广播给在线设备:', client.name)
            client.send(JSON.stringify({ type: 'push', id: ws.id, name: ws.name, channel: ws.channel }))
            ws.send(JSON.stringify({ type: 'list', id: client.id, name: client.name, channel: client.channel }))
        }
    })
})

// WEBHOOK 处理 GitHub 事件
app.post('/webhook', (req, res) => {
    console.log('WEBHOOK:', req.body)
    return exec('git pull;npm i', (err, stdout, stderr) => {
        if (err) return res.status(500).json({ error: err })
        return res.json({ stdout, stderr })
    })
})

app.listen(4096, () => console.log('Server started on port 4096'))
