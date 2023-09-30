import { List, ListItem } from './weigets.js'

export default class ClientList {
    constructor({ channels = {}, EventListeners = {}, name }) {
        this.channels = channels
        this.EventListeners = EventListeners
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const host = window.location.host
        this.websocket = new WebSocket(`${protocol}://${host}/webrtc/music?name=${name}`)
        this.clientlist = []
        this.ul = List({})
        document.body.appendChild(this.ul)

        // 连接 WebSocket
        const linkStart = () => {
            const websocket = new WebSocket(`${protocol}://${host}/webrtc/music?name=${name}`)
            websocket.onmessage = async event => {
                const data = JSON.parse(event.data)
                const channels_init = (webrtc) => {
                    return Object.entries(this.channels).map(([name, callback]) => {
                        const channel = webrtc.createDataChannel(name, { reliable: true })
                        channel.onopen = callback.onopen
                        channel.onclose = callback.onclose
                        channel.onerror = callback.onerror
                        channel.onmessage = callback.onmessage
                        return channel
                    })
                }
                const webrtc_init = () => {
                    const webrtc = new RTCPeerConnection()
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
                        console.log('收到对方 datachannel', channel)
                        channel.onmessage = event => {
                            //console.log('收到对方 datachannel message', event)
                            if (this.channels[event.target.label]) {
                                this.channels[event.target.label].onmessage(event, this.clientlist.find(x => x.id === data.id))
                            }
                        }
                    }
                    webrtc.oniceconnectionstatechange = event => {
                        //console.log('WebRTC ICE 连接状态更改:', webrtc.iceConnectionState)
                    }
                    return webrtc
                }
                if (data.type === 'list') {
                    //console.log('取得在线对端列表:', data)
                    const webrtc = webrtc_init()
                    const channels = channels_init(webrtc)
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
                    const webrtc = webrtc_init()
                    const channels = channels_init(webrtc)
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
                    // console.log('收到 candidate 并将其添加到远程端', data.candidate)
                    const pc = this.clientlist.find(client => client.id === data.id).webrtc
                    await pc.addIceCandidate(data.candidate)
                    return
                }
                console.log('收到未知数据:', data)
            }
            websocket.onclose = event => {
                console.log('WebSocket 断线重连...')
                setTimeout(() => {
                    this.websocket = linkStart()
                }, 1000)
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
    // 通过指定通道发送数据(广播)
    send(name, data) {
        //console.log('广播数据:', data, '到通道:', name, '到所有客户端')
        this.clientlist.forEach(client => {
            console.log('发送数据到客户端:', client.id, '通道:', name, '数据:', data)
            client.channels.filter(ch => ch.label === name).forEach(ch => {
                ch.send(data)
            })
        })
    }
}
