import { Span, Button, List, ListItem } from './weigets.js'

export default class MusicList {
    constructor({ list = [], EventListeners = {}, onplay, onstop, onadd, onremove, onlike, onunlike, onban, onload }) {
        this.event = { onplay, onstop, onadd, onremove, onlike, onunlike, onban, onload }
        this.ul = List({})
        this.ul.classList.add('music-list')
        this.EventListeners = EventListeners
        this.list = []
        list.forEach(item => this.add(item)) // 列表逐一添加
        document.body.appendChild(this.ul)   // 元素加入页面

        // 添加音乐播放器
        this.audio = new Audio()
        this.audio.addEventListener('ended', () => {
            this.next()
        })
        //this.audio.addEventListener('timeupdate', () => {
        //    console.log(this.audio.currentTime)
        //})
        // 本地添加音乐按钮
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        input.accept = 'audio/*'
        input.onchange = event => {
            for (const file of event.target.files) {
                const id = 'music' + Date.now()
                const { name, size, type } = file
                const reader = new FileReader()
                reader.onload = async event => {
                    const arrayBuffer = event.target.result
                    this.add({ id, name, size, type, arrayBuffer })  // 添加到列表(默认并不存储)
                    this.like({ id, name, size, type, arrayBuffer }) // 本地缓存的必要条件是喜欢
                }
                reader.readAsArrayBuffer(file)
            }
        }
        // 写入 css 样式到 head
        const style = document.createElement('style')
        style.innerText = `
            ul.music-list {
                max-height: 70vh;
                overflow-y: auto;
            }
            ul.music-list > li > span {
                cursor: pointer;
            }
            ul.music-list > li.play > span {
                color: #02be08;
            }
            ul.music-list > li.cache::marker {
                color: #02be08;
                font-size: 1em;
                contentx: '⚡';
            }
            ul.music-list > li.disable {
                color: #999999;
            }
            ul.music-list > li > button {
                margin-left: 10px;
                border: none;
                border-radius: 1em;
                cursor: pointer;
                user-select: none;
                font-size: .5rem;
                padding: 0 .5rem;
                color: #555555;
            }
            ul.music-list > li > button:hover {
                background-color: #ccc;
            }
        `
        document.head.appendChild(style)
        document.body.appendChild(input)
    }
    add(item) {
        // 如果ID已存在则不添加
        if (this.list.find(i => i.id === item.id)) {
            return
        }
        // 将字节转换为可读的单位
        const bytesToSize = bytes => {
            if (bytes === 0) return '0 B'
            const k = 1024
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
            const i = Math.floor(Math.log(bytes) / Math.log(k))
            return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
        }
        this.list.push(item)
        this.ul.appendChild(ListItem({
            id: item.id,
            classList: item.arrayBuffer ? ['cache'] : [],
            children: [
                Span({
                    textContent: `${item.name} - ${bytesToSize(item.size)}`,
                    onclick: event => {
                        event.stopPropagation()
                        const li = event.target.parentElement  // ListItem
                        const ul = li.parentElement            // List
                        const list = Array.from(ul.children)   // ListItems
                        list.forEach(li => li.classList.remove('play'))
                        if (!this.audio.paused && this.playing === item) {
                            li.classList.remove('play')
                            this.stop(item)
                        } else {
                            li.classList.add('play')
                            this.play(item)
                        }
                    }
                }),
                Button({
                    textContent: item.save ? '移除' : '缓存',
                    onclick: event => {
                        event.stopPropagation()
                        if (item.save) {
                            event.target.textContent = '缓存'
                            this.ul.querySelector(`#${item.id}`).classList.remove('cache')
                            this.unlike(item)
                        } else {
                            item.save = true
                            event.target.textContent = '移除'
                            this.ul.querySelector(`#${item.id}`).classList.add('cache')
                            this.like(item)
                        }
                    }
                })
            ]
        }))
        this.event.onadd(item, this.list)
    }
    async remove(item) {
        this.ul.querySelector(`#${item.id}`)?.remove()
        if (!this.audio.paused) this.stop() // 停止播放
        this.list = this.list.filter(i => i.id !== item.id)
        this.event.onremove(item)
    }
    async load(item) {
        await this.event.onload(item)
    }
    async play(item) {
        if (!item.arrayBuffer) {
            // 边加载边播放
            const mediaSource = new MediaSource()
            this.audio.src = URL.createObjectURL(mediaSource)
            if (!item.arrayBufferChunks) item.arrayBufferChunks = []
            mediaSource.addEventListener('sourceopen', async () => {
                const type = item.type === 'audio/wav' ? 'audio/wav; codecs=1' : item.type
                const sourceBuffer = mediaSource.addSourceBuffer(type)
                const arrayBufferLoader = async (index = 0) => {
                    console.log('开始加载====================================')
                    // 按照数据长度计算出分片应有数量, 如果数量不到且没有停止加载则一直读取
                    const chunkNumber = Math.ceil(item.size / 1024 / 64) // 64KB每片
                    console.log({ index, chunkNumber, paused: this.audio.paused })
                    while (index < chunkNumber && !this.audio.paused) {
                        const 播放状态 = !this.audio.paused && this.playing === item
                        const 加载状态 = item.arrayBufferChunks.length < chunkNumber
                        const 结束时间 = sourceBuffer.buffered.length && sourceBuffer.buffered.end(0)
                        const 缓冲时间 = 结束时间 - this.audio.currentTime
                        if (!播放状态 && !加载状态) break                        // 播放停止且加载完毕则退出
                        if (this.audio.paused || this.playing !== item) break // 播放停止或已经切歌则退出
                        if (缓冲时间 > 60) {                                    // 缓冲超过60秒则等待30秒
                            await new Promise(resolve => setTimeout(resolve, 30000))
                            continue
                        }
                        if (sourceBuffer.updating) { // sourceBuffer正在更新则等待更新结束
                            await new Promise(resolve => sourceBuffer.addEventListener('updateend', resolve))
                            continue
                        }
                        if (item.arrayBufferChunks.length <= index) { // 分片数量不足则等待
                            await new Promise(resolve => setTimeout(resolve, 200))
                            continue
                        }
                        console.log('播放器加载分片:', item.name, `${index+1}/${chunkNumber}`)
                        const chunk = item.arrayBufferChunks[index]           // 顺序取出一个arrayBuffer分片
                        sourceBuffer.appendBuffer(chunk)                      // 添加到sourceBuffer
                        index++
                    }
                    console.log('加载完毕====================================')
                    item.arrayBufferChunks = null // 加载完毕释放分片内存
                }
                this.event.onload(item)
                this.audio.play()
                arrayBufferLoader()
            })
        } else {
            // 本地缓存直接播放
            this.audio.src = URL.createObjectURL(new Blob([item.arrayBuffer], { type: item.type }))
            this.audio.play()
        }
        this.playing = item
        this.event.onplay(item)
    }
    async stop() {
        if (this.audio.paused) {
            return console.error('暂停播放:音乐播放器不是播放状态!')
        }
        this.audio.pause()
        this.event.onstop(this.playing)
        this.playing = null
    }
    async like(item) {
        if (!item.arrayBuffer) {
            await this.load(item)
        }
        this.event.onlike(item, this.list)
    }
    async unlike(item) {
        this.event.onunlike(item, this.list)
    }
    async ban(item) {
        this.event.onban(item)
    }
    next() { }
    prev() { }
}
