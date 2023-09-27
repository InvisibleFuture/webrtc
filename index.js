import express from 'express'
import expressWs from 'express-ws'

const app = express()
const wsInstance = expressWs(app)
app.use(express.static('public'))

// Websocket 处理 webRTC 信令
app.ws('/webrtc/:channel', (ws, req) => {
    ws.id = req.headers['sec-websocket-key']
    ws.channel = req.params.channel
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
        const { id } = JSON.parse(message)
        wsInstance.getWss().clients.forEach(client => {
            if (client !== ws && client.readyState === 1 && client.channel === ws.channel && client.id === id) {
                client.send(message)
            }
        })
    })
    // 设备加入频道时广播给所有在线设备(也获取所有在线设备)
    console.log(ws.id, '设备加入频道:', ws.channel, wsInstance.getWss().clients.size)
    wsInstance.getWss().clients.forEach(client => {
        if (client !== ws && client.readyState === 1 && client.channel === ws.channel) {
            client.send(JSON.stringify({ type: 'push', id: ws.id, channel: ws.channel }))
            ws.send(JSON.stringify({ type: 'push', id: client.id, channel: client.channel }))
        }
    })
})

app.listen(3000, () => console.log('Server started on port 3000'))
