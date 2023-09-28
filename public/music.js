import IndexedDB from './database.js'
import { Button, List, ListItem } from './weigets.js'

export default class MusicList {
    constructor() {
        this.ul = List({})
        this.store = new IndexedDB('musicDatabase', 1, 'musicObjectStore')
        this.store.open().then(() => {
            this.store.getAll().then((data) => {
                console.log(data)
                data.forEach(item => this.add(item))
            })
        })
        document.body.appendChild(this.ul)

        // 添加音乐播放器
        this.audio = new Audio()
        this.audio.addEventListener('ended', () => {
            this.next()
        })
        this.audio.addEventListener('timeupdate', () => {
            console.log(this.audio.currentTime)
        })

        // 添加音乐按钮
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        input.accept = 'audio/*'
        input.onchange = event => {
            console.log('event.target.files', event.target.files)
            for (const file of event.target.files) {
                const id = Date.now()
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
    add(item) {
        this.store.add(item)
        const li = ListItem({
            id: item.id,
            innerText: `${item.name} - ${item.size} - ${item.type} - ${item.id}`,
            onclick: event => {
                event.stopPropagation()
                this.play(item.id)
            },
            children: [
                Button({
                    innerText: '播放',
                    onclick: event => {
                        event.stopPropagation()
                        this.play(item.id)
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
                        this.delete(item.id)
                    }
                })
            ]
        })
        this.ul.appendChild(li)
    }
    delete(id) {
        // 如果是正在播放的歌曲，停止播放
        this.stop(id)
        const li = this.ul.querySelector(`li[data-id="${id}"]`)
        this.ul.removeChild(li)
        this.store.delete(id)
    }
    play(id) { }
    stop(id) { }
    next() { }
    prev() { }
}
