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
        //const style = document.createElement('style')
        //style.innerText = `
        //    ul.music-list {
        //        width: 600px;
        //        height: 100%;
        //        overflow: auto;
        //        background-color: #ffffff;
        //        box-shadow: 0 0 15px #ccc;
        //        border-radius: 5px;
        //        padding: 1rem 2rem;
        //        margin: 1rem;
        //    }
        //    ul.music-list > li {
        //        list-style: none;
        //        padding: 10px;
        //        border-bottom: 1px solid #ccc;
        //        cursor: pointer;
        //    }
        //    ul.music-list > li:hover {
        //        background-color: #ddd;
        //    }
        //    ul.music-list > li > button {
        //        margin-right: 10px;
        //    }
        //    ul.music-list > li > button:hover {
        //        background-color: #ccc;
        //    }
        //    ul.music-list > li
        //    `
        //document.head.appendChild(style)
        document.body.appendChild(input)
    }
    // 添加回调函数
    on(name, callback) {
        this.EventListeners[name] = callback
    }
    add(item) {
        this.list.push(item)
        this.ul.appendChild(ListItem({
            id: item.id,
            innerText: `${item.name} - ${item.size} - ${item.type} - ${item.id}`,
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
                        // BAN
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
