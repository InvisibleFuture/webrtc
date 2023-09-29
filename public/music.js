import IndexedDB from './database.js'
import { Button, List, ListItem } from './weigets.js'

export default class MusicList {
    constructor() {
        this.EventListeners = {}
        this.ul = List({})
        this.list = []
        this.store = new IndexedDB('musicDatabase', 1, 'musicObjectStore')
        this.store.open().then(() => {
            this.store.getAll().then((data) => {
                this.list = data
                data.forEach(item => this.__add(item))
            })
        })
        document.body.appendChild(this.ul)

        // 添加音乐播放器
        this.audio = new Audio()
        this.audio.addEventListener('ended', () => {
            this.next()
        })
        //this.audio.addEventListener('timeupdate', () => {
        //    console.log(this.audio.currentTime)
        //})

        // 添加音乐按钮
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
        document.body.appendChild(input)
    }
    // 仅添加UI
    __add(item) {
        const li = ListItem({
            id: item.id,
            innerText: `${item.name} - ${item.size} - ${item.type} - ${item.id}`,
            onclick: event => {
                event.stopPropagation()
                this.play(item)
            },
            children: [
                Button({
                    innerText: '播放',
                    onclick: event => {
                        event.stopPropagation()
                        this.play(item)
                    }
                }),
                Button({
                    innerText: '停止',
                    onclick: event => {
                        event.stopPropagation()
                        this.stop(item.id)
                    }
                }),
                Button({
                    innerText: '移除',
                    onclick: event => {
                        event.stopPropagation()
                        this.delete(item)
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
                        // BAN
                    }
                })
            ]
        })
        this.ul.appendChild(li)
    }
    // 叠加数据(双方数据计数器上升)
    async push(item) {
        console.log('叠加数据: 只增加UI不存储本地', item)
        // 先检测是否已经存在
        const data = await this.store.get(item.id)
        if (data) {
            console.log('数据已存在:', data)
            return
        }
        this.__add(item)
    }
    // 添加数据并添加UI
    add(item) {
        this.store.add(item)
        this.__add(item)
    }
    delete(item) {
        this.store.delete(item.id)
        this.ul.removeChild(this.ul.querySelector(`#${item.id}`))
        this.stop() // 停止播放
    }
    play(item) {
        this.audio.src = URL.createObjectURL(new Blob([item.arrayBuffer], { type: item.type }))
        this.audio.play()
        this._on('play', item)
    }
    stop() {
        this.audio.pause()
        this.audio.src = ''
        this._on('stop')
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
}
