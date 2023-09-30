import { Button, List, ListItem } from './weigets.js'

export default class MusicList {
    constructor({ list = [], EventListeners = {} }) {
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
                    this.add({ id, name, size, type, arrayBuffer })
                }
                reader.readAsArrayBuffer(file)
            }
        }
        //// 写入 css 样式到 head
        const style = document.createElement('style')
        style.innerText = `
            ul.music-list > li {
                cursor: pointer;
            }
            ul.music-list > li > button {
                margin-left: 10px;
                border: none;
                cursor: pointer;
            }
            ul.music-list > li > button:hover {
                background-color: #ccc;
            }
            `
        document.head.appendChild(style)
        document.body.appendChild(input)
    }
    // 添加回调函数
    on(name, callback) {
        this.EventListeners[name] = callback
    }
    add(item) {
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
            innerText: `${item.name} - ${bytesToSize(item.size)}`,
            children: [
                Button({
                    innerText: '播放',
                    onclick: event => {
                        event.stopPropagation()
                        if (event.target.dataset.play === 'play') {
                            event.target.dataset.play = 'stop'
                            event.target.innerText = '播放'
                            this.stop()
                        } else {
                            event.target.dataset.play = 'play'
                            event.target.innerText = '停止'
                            this.play(item)
                        }
                    }
                }),
                Button({
                    innerText: '移除',
                    onclick: event => {
                        event.stopPropagation()
                        this.remove(item)
                    }
                }),
                Button({
                    innerText: '喜欢',
                    onclick: event => {
                        event.stopPropagation()
                        this.like(item)
                    }
                }),
                Button({
                    innerText: '禁止',
                    onclick: event => {
                        event.stopPropagation()
                        if (event.target.dataset.ban === 'ban') {
                            event.target.dataset.ban = 'unban'
                            event.target.innerText = '禁止'
                        } else {
                            event.target.dataset.ban = 'ban'
                            event.target.innerText = '解禁'
                            this.stop()
                        }
                    }
                })
            ]
        }))
        // 执行回调函数
        if (this.EventListeners['add']) {
            this.EventListeners['add'](item)
        }
    }
    remove(item) {
        this.ul.removeChild(this.ul.querySelector(`#${item.id}`))
        this.stop() // 停止播放
        // 执行回调函数
        if (this.EventListeners['remove']) {
            this.EventListeners['remove'](item)
        }
    }
    async load(item) {
        // 执行回调函数(应当异步)
        if (this.EventListeners['load']) {
            await this.EventListeners['load'](item)
        }
    }
    async play(item) {
        if (!item.arrayBuffer) {
            console.log('等待载入缓存:', item)
            await this.load(item)
            console.log('缓存载入完成:', item)
        }
        this.audio.src = URL.createObjectURL(new Blob([item.arrayBuffer], { type: item.type }))
        this.audio.play()
        // 执行回调函数
        if (this.EventListeners['play']) {
            this.EventListeners['play'](item)
        }
    }
    stop() {
        this.audio.pause()
        this.audio.src = ''
        // 执行回调函数
        if (this.EventListeners['stop']) {
            this.EventListeners['stop']()
        }
    }
    like(item) {
        if (!item.arrayBuffer) {
            console.log('载入缓存:', item)
            return
        } else {
            console.log('移除缓存:', item)
            return
        }
    }
    next() { }
    prev() { }
}
