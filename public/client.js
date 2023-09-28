import { List, ListItem } from './weigets.js'

export default class ClientList {
    constructor() {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const host = window.location.host
        this.websocket = new WebSocket(`${protocol}://${host}/webrtc/music`)
        this.clientlist = []
        this.ul = List({})
        document.body.appendChild(this.ul)
        //this.websocket.onopen = event => {
        //    console.log('clientlist websocket: onopen')
        //    console.log('当连接建立时，服务器将逐一发送所有客户端信息')
        //}
        this.websocket.onmessage = async event => {
            const data = JSON.parse(event.data)
            if (data.type === 'list') {
                console.log('取得在线对端列表:', data)
                const webrtc = new RTCPeerConnection()
                webrtc.createDataChannel('music')
                webrtc.onicecandidate = event => {
                    console.log('clientlist onicecandidate E', event)
                    if (event.candidate) {
                        this.websocket.send(JSON.stringify({ type: 'candidate', id: data.id, candidate: event.candidate }))
                    }
                }
                console.log('发送给对方 offer')
                const offer = await webrtc.createOffer()
                await webrtc.setLocalDescription(offer)
                this.clientlist.push({ id: data.id, name: data.name, webrtc })
                this.websocket.send(JSON.stringify({ type: 'offer', id: data.id, offer }))
                return this.add(data)
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
                console.log('收到对方 offer', data)
                const webrtc = new RTCPeerConnection()
                webrtc.createDataChannel('music')
                webrtc.onicecandidate = event => {
                    console.log('clientlist onicecandidate X', event)
                    if (event.candidate) {
                        this.websocket.send(JSON.stringify({ type: 'candidate', id: data.id, candidate: event.candidate }))
                    }
                }
                this.clientlist.push({ id: data.id, name: data.name, webrtc })
                console.log('发送给对方 answer')
                await webrtc.setRemoteDescription(data.offer)
                const answer = await webrtc.createAnswer()
                await webrtc.setLocalDescription(answer)
                this.websocket.send(JSON.stringify({ type: 'answer', id: data.id, answer }))
                return
            }
            if (data.type === 'answer') {
                console.log('收到对方 answer', data)
                const pc = this.clientlist.find(client => client.id === data.id).webrtc
                await pc.setRemoteDescription(data.answer)
                return
            }
            if (data.type === 'candidate') {
                const pc = this.clientlist.find(client => client.id === data.id).webrtc
                await pc.addIceCandidate(data.candidate)
                return console.log('收到 candidate 并将其添加到远程端', data.candidate)
            }
            console.log('收到未知数据:', data)
        }
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
    on(event, callback) { }
}
