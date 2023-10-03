import { List, ListItem } from './weigets.js'

export default class ClientList {
    constructor({ channels = {}, EventListeners = {}, name: username, onexit }) {
        this.event = { onexit }
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
                        iceServers: [
                            {
                                urls: 'turn:satori.love:3478?transport=udp',
                                username: 'x-username',
                                credential: 'x-password'
                            },
                            {
                                urls: [
                                    'stun:stun.1und1.de',
                                    'stun:stun.callwithus.com',
                                    'stun:stun.ekiga.net',
                                    'stun:stun.fwdnet.net',
                                    'stun:stun.fwdnet.net:3478',
                                    'stun:stun.gmx.net',
                                    'stun:stun.iptel.org',
                                    'stun:stun.internetcalls.com',
                                    'stun:stun.minisipserver.com',
                                    'stun:stun.schlund.de',
                                    'stun:stun.sipgate.net',
                                    'stun:stun.sipgate.net:10000',
                                    'stun:stun.softjoys.com',
                                    'stun:stun.softjoys.com:3478',
                                    'stun:stun.voip.aebc.com',
                                    'stun:stun.voipbuster.com',
                                    'stun:stun.voipstunt.com',
                                    'stun:stun.voxgratia.org',
                                    'stun:stun.wirlab.net',
                                    'stun:stun.xten.com',
                                    'stun:stunserver.org',
                                    'stun:stun01.sipphone.com',
                                    'stun:stun.zoiper.com'
                                ]
                            }
                        ],
                        iceCandidatePoolSize: 10,  // 限制 ICE 候选者的数量
                        iceTransportPolicy: 'all', // 使用所有可用的候选者
                        bundlePolicy: 'balanced',  // 每種類型的內容建立一個單獨的傳輸
                    })
                    webrtc.ondatachannel = ({ channel }) => {
                        console.log(data.name, '建立', channel.label, '数据通道')
                        const client = this.clientlist.find(x => x.id === data.id)
                        const option = this.channels[channel.label]
                        channel.onopen = event => {
                            console.log('对方打开', channel.label, '数据通道')
                            if (option && option.onopen) {
                                option.onopen(event, client)
                            }
                        }
                        channel.onmessage = event => {
                            //console.log('对方发送', channel.label, '数据消息')
                            if (option && option.onmessage) {
                                option.onmessage(event, client)
                            }
                        }
                        channel.onclose = event => {
                            console.log('对方关闭', channel.label, '数据通道')
                            if (option && option.onclose) {
                                option.onclose(event, client)
                            }
                        }
                        channel.onerror = event => {
                            console.log(data.name, '通道', channel.label, '发生错误')
                            if (option && option.onerror) {
                                option.onerror(event, client)
                            }
                        }
                    }
                    webrtc.onicecandidate = event => {
                        if (event.candidate) {
                            websocket.send(JSON.stringify({
                                type: 'candidate',
                                id: data.id,
                                candidate: event.candidate
                            }))
                        }
                    }
                    webrtc.getReceivers
                    webrtc.getTransceivers
                    webrtc.oniceconnectionstatechange = async event => {
                        if (webrtc.iceConnectionState === 'disconnected' || webrtc.iceConnectionState === 'failed') {
                            console.log(data.name, '需要添加新的 candidate')
                            // 添加新的 candidate
                        } else if (webrtc.iceConnectionState === 'connected' || webrtc.iceConnectionState === 'completed') {
                            console.log(data.name, 'WebRTC 连接已经建立成功')
                        }
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
                    return this.exit(data)
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
                    const webrtc = this.clientlist.find(client => client.id === data.id).webrtc
                    await webrtc.setRemoteDescription(data.answer)
                    return
                }
                if (data.type === 'candidate') {
                    console.log(data.name, '发来 candidate 候选通道')
                    const webrtc = this.clientlist.find(client => client.id === data.id).webrtc
                    await webrtc.addIceCandidate(data.candidate)
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
    exit(item) {
        const client = this.clientlist.find(client => client.id === item.id)
        if (!client) return console.log('目标用户本不存在')
        this.clientlist = this.clientlist.filter(client => client.id !== item.id)
        this.ul.removeChild(document.getElementById(item.id))
        this.event.onexit(client)
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
        this.clientlist.forEach(client => {
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
