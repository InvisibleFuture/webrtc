import { List, ListItem } from './weigets.js'

export default class ClientList {
    constructor({ channels = {}, EventListeners = {} }) {
        this.channels = channels
        this.EventListeners = EventListeners
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const host = window.location.host
        this.websocket = new WebSocket(`${protocol}://${host}/webrtc/music`)
        this.clientlist = []
        this.ul = List({})
        document.body.appendChild(this.ul)
        this.websocket.onmessage = async event => {
            const data = JSON.parse(event.data)
            const webrtc_init = () => {
                const webrtc = new RTCPeerConnection()
                Object.entries(channels).forEach(([name, callback]) => {
                    const channel = webrtc.createDataChannel(name)
                    channel.onopen = event => {
                        //console.log('datachannel 已打开', event)
                        if (callback.onopen) callback.onopen(event)
                    }
                    channel.onclose = event => {
                        //console.log('datachannel 已关闭', event)
                        if (callback.onclose) callback.onclose(event)
                    }
                    channel.onerror = event => {
                        //console.log('datachannel 发生错误', event)
                        if (callback.onerror) callback.onerror(event)
                    }
                    channel.onmessage = event => {
                        //console.log('datachannel 收到数据', event)
                        if (callback.onmessage) callback.onmessage(event)
                    }
                })
                webrtc.onicecandidate = event => {
                    if (event.candidate) {
                        this.websocket.send(JSON.stringify({
                            type: 'candidate',
                            id: data.id,
                            candidate: event.candidate
                        }))
                    }
                }
                webrtc.ondatachannel = ({ channel }) => {
                    //console.log('收到对方 datachannel', channel)
                    channel.onmessage = event => {
                        //console.log('收到对方 datachannel message', event)
                        if (channels[event.target.label]) {
                            channels[event.target.label].onmessage(event, channel)
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
                //console.log('发送给对方 offer')
                const offer = await webrtc.createOffer()
                await webrtc.setLocalDescription(offer)
                this.clientlist.push({ id: data.id, name: data.name, webrtc })
                this.websocket.send(JSON.stringify({ type: 'offer', id: data.id, offer }))
                this.add(data)
                return
            }
            if (data.type === 'push') {
                console.log('新上线客户端:', data)
                return this.add(data)
            }
            if (data.type === 'pull') {
                console.log('移除客户端:', data)
                return this.remove(data)
            }
            if (data.type === 'offer') {
                //console.log('收到对方 offer', data)
                const webrtc = webrtc_init()
                this.clientlist.push({ id: data.id, name: data.name, webrtc })
                //console.log('发送给对方 answer')
                await webrtc.setRemoteDescription(data.offer)
                const answer = await webrtc.createAnswer()
                await webrtc.setLocalDescription(answer)
                this.websocket.send(JSON.stringify({ type: 'answer', id: data.id, answer }))
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
    update(item) { }
    get(id) { }
    getAll() { }
    clear() { }
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
        console.log('广播数据:', data, '到通道:', name, '到所有客户端')
        this.clientlist.forEach(client => {
            console.log('发送数据到客户端:', client.id)
            const channel = client.webrtc.getDataChannel(name) ?? client.webrtc.createDataChannel(name)
            channel.send(data)
        })
    }
}
