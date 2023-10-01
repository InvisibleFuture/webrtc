import { List, ListItem } from './weigets.js'

export default class ClientList {
    constructor({ channels = {}, EventListeners = {}, name: username }) {
        this.channels = channels
        this.EventListeners = EventListeners
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const host = window.location.host
        this.clientlist = []
        this.ul = List({})
        document.body.appendChild(this.ul)

        // 连接 WebSocket
        const linkStart = () => {
            const websocket = new WebSocket(`${protocol}://${host}/webrtc/music?name=${username}`)
            websocket.onmessage = async event => {
                const data = JSON.parse(event.data)
                const webrtc_init = async () => {
                    const webrtc = new RTCPeerConnection({
                        iceServers: [{
                            urls: 'turn:satori.love:3478',
                            username: 'x-username',
                            credential: 'x-password'
                        }]
                    })
                    webrtc.onicecandidate = event => {
                        if (event.candidate) {
                            websocket.send(JSON.stringify({
                                type: 'candidate',
                                id: data.id,
                                candidate: event.candidate
                            }))
                        }
                    }
                    webrtc.ondatachannel = ({ channel }) => {
                        console.log('对方建立数据通道', channel.label)
                        const client = this.clientlist.find(x => x.id === data.id)
                        const option = this.channels[channel.label]
                        channel.onopen = event => {
                            console.log('对方打开数据通道', channel.label)
                            if (option && option.onopen) {
                                option.onopen(event, client)
                            }
                        }
                        channel.onmessage = event => {
                            //console.log('对方发送数据消息', channel.label)
                            if (option && option.onmessage) {
                                option.onmessage(event, client)
                            }
                        }
                        channel.onclose = event => {
                            console.log('对方关闭数据通道', channel.label)
                            if (option && option.onclose) {
                                option.onclose(event, client)
                            }
                        }
                        channel.onerror = event => {
                            console.log('对方数据通道发生错误', channel.label)
                            if (option && option.onerror) {
                                option.onerror(event, client)
                            }
                        }
                    }
                    webrtc.oniceconnectionstatechange = event => {
                        console.log('WebRTC ICE 连接状态更改:', webrtc.iceConnectionState)
                    }
                    const channels = Object.entries(this.channels).map(([name, callback]) => {
                        const channel = webrtc.createDataChannel(name, { reliable: true })
                        return channel
                    })
                    return { webrtc, channels }
                }
                if (data.type === 'list') {
                    //console.log('取得在线对端列表:', data)
                    const { webrtc, channels } = await webrtc_init()
                    //console.log('发送给对方 offer')
                    const offer = await webrtc.createOffer()
                    await webrtc.setLocalDescription(offer)
                    this.clientlist.push({ id: data.id, name: data.name, webrtc, channels })
                    websocket.send(JSON.stringify({ type: 'offer', id: data.id, offer }))
                    this.add(data)
                    return
                }
                if (data.type === 'push') {
                    //console.log('新上线客户端:', data)
                    return this.add(data)
                }
                if (data.type === 'pull') {
                    //console.log('移除客户端:', data)
                    return this.remove(data)
                }
                if (data.type === 'offer') {
                    //console.log('收到对方 offer', data)
                    const { webrtc, channels } = await webrtc_init()
                    this.clientlist.push({ id: data.id, name: data.name, webrtc, channels })
                    //console.log('发送给对方 answer')
                    await webrtc.setRemoteDescription(data.offer)
                    const answer = await webrtc.createAnswer()
                    await webrtc.setLocalDescription(answer)
                    websocket.send(JSON.stringify({ type: 'answer', id: data.id, answer }))
                    return
                }
                if (data.type === 'answer') {
                    //console.log('收到对方 answer', data)
                    const pc = this.clientlist.find(client => client.id === data.id).webrtc
                    await pc.setRemoteDescription(data.answer)
                    return
                }
                if (data.type === 'candidate') {
                    console.log(data.name, '发来 candidate 候选通道')
                    const pc = this.clientlist.find(client => client.id === data.id).webrtc
                    await pc.addIceCandidate(data.candidate)
                    return
                }
                console.log('收到未知数据:', data)
            }
            websocket.onclose = async event => {
                console.log('WebSocket 断线重连...')
                await new Promise(resolve => setTimeout(resolve, 10000))
                // this.websocket = linkStart()
                // 调试模式: 直接刷新页面重载
                window.location.reload()
            }
            return websocket
        }
        this.websocket = linkStart()
    }
    setChannel(name, option) {
        this.channels[name] = option
    }
    add(item) {
        this.ul.appendChild(ListItem({
            id: item.id,
            innerText: item.name ?? item.id,
            onclick: event => {
            },
            chidren: []
        }))
    }
    remove(item) {
        this.clientlist = this.clientlist.filter(client => client.id !== item.id)
        this.ul.removeChild(document.getElementById(item.id))
    }
    // 添加回调函数
    on(name, callback) {
        this.EventListeners[name] = callback
    }
    // 执行回调函数
    _on(name, ...args) {
        if (this.EventListeners[name]) {
            this.EventListeners[name](...args)
        }
    }
    // 通过指定通道发送数据(单播)
    sendto(id, name, data) {
        //console.log('发送数据:', data, '到通道:', name, '到客户端:', id)
        const client = this.clientlist.find(client => client.id === id)
        if (!client) {
            console.log('客户端不存在:', id)
            return
        }
        client.channels.filter(ch => ch.label === name).forEach(async ch => {
            // 等待 datachannel 打开(临时解决方案)
            while (ch.readyState !== 'open') {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
            ch.send(data)
        })
    }
    // 通过指定通道发送数据(广播)
    send(name, data) {
        //console.log('广播数据:', data, '到通道:', name, '到所有客户端')
        this.clientlist.forEach(client => {
            //console.log('发送数据到客户端:', client.id, client.name, '通道:', name, '数据:', data)
            client.channels.filter(ch => ch.label === name).forEach(async ch => {
                // 等待 datachannel 打开(临时解决方案)
                while (ch.readyState !== 'open') {
                    await new Promise(resolve => setTimeout(resolve, 100))
                }
                ch.send(data)
            })
        })
    }
}
