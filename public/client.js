import { List, ListItem, Avatar, Span, Dialog, Button, Input } from './weigets.js'

export default class ClientList {
    constructor({ channels = {}, EventListeners = {}, name: username, onexit }) {
        this.event = { onexit }
        this.channels = channels
        this.EventListeners = EventListeners
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const host = window.location.host
        this.clientlist = []
        this.element = List({
            classList: ['userlist'],
        })
        document.body.appendChild(this.element)

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
                        console.debug(data.name, '建立', channel.label, '数据通道')
                        const client = this.clientlist.find(x => x.id === data.id)
                        const option = this.channels[channel.label]
                        channel.onopen = event => {
                            console.debug('对方打开', channel.label, '数据通道')
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
                            console.debug('对方关闭', channel.label, '数据通道')
                            if (option && option.onclose) {
                                option.onclose(event, client)
                            }
                        }
                        channel.onerror = event => {
                            console.error(data.name, '通道', channel.label, '发生错误')
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
                            console.error(data.name, '需要添加新的 candidate')
                            // 添加新的 candidate
                        } else if (webrtc.iceConnectionState === 'connected' || webrtc.iceConnectionState === 'completed') {
                            console.debug(data.name, 'WebRTC 连接已经建立成功')
                        }
                    }
                    const channels = Object.entries(this.channels).map(([name, callback]) => {
                        const channel = webrtc.createDataChannel(name, { reliable: true })
                        return channel
                    })
                    return { webrtc, channels }
                }
                if (data.type === 'list') {
                    console.debug('取得在线对端列表:', data)
                    const { webrtc, channels } = await webrtc_init()
                    console.debug('发送给对方 offer')
                    const offer = await webrtc.createOffer()
                    await webrtc.setLocalDescription(offer)
                    this.clientlist.push({ id: data.id, name: data.name, webrtc, channels })
                    websocket.send(JSON.stringify({ type: 'offer', id: data.id, offer }))
                    this.add(data)
                    return
                }
                if (data.type === 'push') {
                    console.debug('新上线客户端:', data)
                    return this.add(data)
                }
                if (data.type === 'pull') {
                    console.debug('移除客户端:', data)
                    return this.exit(data)
                }
                if (data.type === 'offer') {
                    console.debug('收到对方 offer', data)
                    const { webrtc, channels } = await webrtc_init()
                    this.clientlist.push({ id: data.id, name: data.name, webrtc, channels })
                    console.debug('发送给对方 answer')
                    await webrtc.setRemoteDescription(data.offer)
                    const answer = await webrtc.createAnswer()
                    await webrtc.setLocalDescription(answer)
                    websocket.send(JSON.stringify({ type: 'answer', id: data.id, answer }))
                    return
                }
                if (data.type === 'answer') {
                    console.debug('收到对方 answer', data)
                    const webrtc = this.clientlist.find(client => client.id === data.id).webrtc
                    await webrtc.setRemoteDescription(data.answer)
                    return
                }
                if (data.type === 'candidate') {
                    console.debug(data.name, '发来 candidate 候选通道')
                    const webrtc = this.clientlist.find(client => client.id === data.id).webrtc
                    await webrtc.addIceCandidate(data.candidate)
                    return
                }
                console.error('收到未知数据:', data)
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

        // 插入css样式
        const style = document.createElement('style')
        style.textContent = `
            ul.userlist {
                position: fixed;
                top: 0;
                right: 0;
                display: flex;
                flex-direction: wrap;
                align-items: center;
                list-style: none;
                padding: 0 1rem;
            }
            ul.userlist li {
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                font-size: 12px;
                border-radius: 8px;
            }
            ul.userlist li:first-child {
                color: #2e7d3c;
            }
            ul.userlist li:hover {
                background-color: #eee;
            }
            ul.userlist > * {
                margin: 0 8px;
            }
            ul.userlist li img {
                width:  32px;
                height: 32px;
                border-radius: 50%;
            }
        `
        document.head.appendChild(style)
        // 也插入自己的信息
        const avatar = localStorage.getItem('avatar')
        this.add({ id: 'self', name: username, avatar })
    }
    getAvatar(id) { }
    setAvatar(user) {
        console.info('更新avatar', user)
        document.getElementById(user.id).querySelector('img').src = user.avatar
        this.clientlist.find(client => client.id === user.id).avatar = user.avatar
    }
    exit(item) {
        const client = this.clientlist.find(client => client.id === item.id)
        if (!client) return console.error('目标用户本不存在')
        this.clientlist = this.clientlist.filter(client => client.id !== item.id)
        this.element.removeChild(document.getElementById(item.id))
        this.event.onexit(client)
    }
    setChannel(name, option) {
        this.channels[name] = option
    }
    add(item) {
        this.element.appendChild(ListItem({
            id: item.id,
            onclick: event => {
            },
            children: [
                Avatar({
                    src: item.avatar ?? '/favicon.ico',
                    onclick: event => {
                        event.stopPropagation()
                        // 点击插入一个弹出层
                        document.body.appendChild(Dialog({
                            children: [
                                Avatar({
                                    src: item.avatar ?? '/favicon.ico',
                                    style: {
                                        width: '240px',
                                        height: '240px',
                                        borderRadius: '8px',
                                        margin: '0 auto',
                                        display: 'block',
                                        cursor: 'pointer'
                                    },
                                    onclick: event => {
                                        // 点击上传图片
                                        console.log('点击上传图片')
                                        const input = document.createElement('input')
                                        input.type = 'file'
                                        input.accept = 'image/*'
                                        input.onchange = async event => {
                                            const file = event.target.files[0]
                                            const reader = new FileReader()
                                            reader.readAsDataURL(file)
                                            reader.onload = async event => {
                                                const base64 = event.target.result
                                                localStorage.setItem('avatar', base64)
                                                window.location.reload() // 简单刷新页面
                                            }
                                        }
                                        input.click()
                                    }
                                }),
                                Input({
                                    style: {
                                        width: '100px',
                                        border: '2px dotted #bbb',
                                        borderRadius: '50%',
                                        outline: 'none',
                                        padding: '5px 0',
                                        textAlign: 'center',
                                        position: 'absolute',
                                        bottom: '-5px',
                                        left: '85px',
                                    },
                                    value: item.name ?? item.id,
                                    type: 'text',
                                    placeholder: '请设置你的名字',
                                    onchange: event => {
                                        localStorage.setItem('username', event.target.value)
                                        window.location.reload() // 简单刷新页面
                                    }
                                })
                            ]
                        }))
                    }
                }),
                Span({
                    textContent: item.name ?? item.id,
                    onclick: event => {
                        event.stopPropagation()
                    }
                })
            ]
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
            console.error('客户端不存在:', id)
            return
        }
        if (!client.channels.find(ch => ch.label === name)) {
            console.error('通道不存在:', name)
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
