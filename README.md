# webRTC
webrtc 实现的 p2p 信道

- [x] P2P通信
  - [ ] 分离出主要功能, 作为库或桁架使用
- [x] 音乐播放
  - [x] 请求到单个目标防止接收到重复分片数据
    - [x] 主机记录各自曲目列表以供查询
  - [x] 播放时高亮显示
  - [x] 合并操作按钮
  - [x] 响应列表时不再广播
  - [x] 对方退出时清除其列表
  - [x] 稳定通信
  - [x] 分片请求时立即播放
  - [ ] 上锁防止连续重复加载同一个造成分片混乱
  - [x] 使用单独的状态标识音乐是否缓存
  - [x] 取消本地存储时不直接移除列表
  - [x] 分片下载过程与播放控制分离
  - [x] 分片播放时支持wav
  - [ ] 分片播放时支持flac
  - [ ] 取消本地存储时检查是否移除(其它成员可能有同一曲)
  - [ ] 成员列表刷新时播放被重置BUG
- [ ] 集群分发
- [ ] 下载加速
- [ ] 即时通讯

- 能获取所有在线设备列表
- 随机连接至四个设备, 且按效率扩展收缩
- 将数据拆解同时向多台设备分发, 对端接收后再次分发
- 需要确保全部设备获得全部数据, 每台设备至少一半不重复
- 五色
- 单向链
- 固定填位(矩阵)
```txt
[a1, b1, c1, d1, e1]
        [a2, b2, c2, d2, e2]
                [a3, b3, c3, d3, e3]
```


备用代码片段
```html
    <script type="module">

        // webRTC 传递音乐(分别传输文件和操作事件能更流畅)
        const music = async function () {
            const clients = [] // 客户端列表

            // 对端设备
            const ul = document.createElement('ul')
            document.body.appendChild(ul)
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
            const host = window.location.host
            const ws = new WebSocket(`${protocol}://${host}/webrtc/music`)
            const pc = new RTCPeerConnection()

            var audioSource = null
            // 监听音乐列表播放事件
            musicList.on('play', async item => {
                audioSource?.stop() // 先停止可能在播放的音乐
                console.log('播放音乐', item.arrayBuffer)
                // 复制一份 item.arrayBuffer
                const arrayBuffer = item.arrayBuffer.slice(0)
                // 传输音乐文件向远程端
                const audioContext = new AudioContext()
                audioContext.decodeAudioData(arrayBuffer, async audioBuffer => {
                    // 将音乐流添加到 RTCPeerConnection
                    const mediaStreamDestination = audioContext.createMediaStreamDestination()
                    mediaStreamDestination.stream.getAudioTracks().forEach(function (track) {
                        pc.addTrack(track, mediaStreamDestination.stream)
                    })
                    // 播放音乐(远程)
                    audioSource = audioContext.createBufferSource()
                    audioSource.buffer = audioBuffer
                    audioSource.connect(mediaStreamDestination)
                    audioSource.start()
                    // 创建SDP offer并将其设置为本地描述, 发送给指定的远程端
                    const id = clients[0].id
                    await pc.setLocalDescription(await pc.createOffer())     // 设置本地描述为 offer
                    ws.send(JSON.stringify({ id, offer: pc.localDescription }))  // 发送给远程终端 offer
                })
            })
            // 监听音乐列表停止事件
            musicList.on('stop', async () => {
                audioSource?.stop()
                audioSource = null
            })
            // 监听 ICE 候选事件
            pc.onicecandidate = event => {
                if (event.candidate) {
                    const id = clients[0].id
                    ws.send(JSON.stringify({ id, candidate: event.candidate }))  // 发送 ICE 候选到远程终端
                }
            }
            // 监听远程流事件
            pc.ontrack = function (event) {
                console.log('pc ontrack:', event)
                const audio = document.createElement('audio')
                audio.srcObject = event.streams[0]
                audio.play()
            }
            ws.onmessage = async (event) => {
                const data = JSON.parse(event.data)
                if (data.type === 'push') {
                    console.log('收到 type:push 将设备增加', data.id)
                    clients.push({ id: data.id, channel: data.channel })
                    const li = document.createElement('li')
                    li.innerText = `id:${data.id} channel:${data.channel}`
                    li.id = data.id
                    li.onclick = async () => {
                        console.log('点击设备', data.id)
                        // 清理所有选中状态
                        clients.forEach(client => {
                            const li = document.getElementById(client.id)
                            if (data.id === client.id) {
                                li.style.backgroundColor = 'red'
                                console.log('设置选中状态', data.id)
                                return
                            }
                            li.style.backgroundColor = 'transparent'
                            console.log('清理选中状态', client.id)
                        })
                    }
                    ul.appendChild(li)
                    return
                }
                if (data.type === 'pull') {
                    console.log('收到 type:pull 将设备删除', data.id)
                    const index = clients.findIndex(client => client.id === data.id)
                    if (index !== -1) {
                        clients.splice(index, 1)
                        const li = document.getElementById(data.id)
                        li.remove()
                    }
                    return
                }
                if (data.type === 'error') {
                    console.log('收到 type:error 没什么可操作的', data.id)
                    return
                }
                if (data.offer) {
                    const id = clients[0].id
                    console.log('收到 offer 并将其设置为远程描述', data.offer)
                    await pc.setRemoteDescription(new RTCSessionDescription(data.offer)) // 设置远程描述为 offer
                    await pc.setLocalDescription(await pc.createAnswer())                // 设置本地描述为 answer
                    ws.send(JSON.stringify({ id, answer: pc.localDescription }))         // 发送给远程终端 answer
                    return
                }
                if (data.answer) {
                    console.log('收到 answer 并将其设置为远程描述', data.answer)
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
                    return
                }
                if (data.candidate) {
                    console.log('收到 candidate 并将其添加到远程端', data.candidate)
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
                    return
                }
            }
        }
        //music()
    </script>
    <script type="module">
        // 创建 RTCPeerConnection
        const pc = new RTCPeerConnection()
        // webSocket 连接服务器
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const host = window.location.host
        const ws = new WebSocket(`${protocol}://${host}/webrtc/default`)
        ws.onopen = function () {
            console.log('video ws open')
        }
        ws.onmessage = function (event) {
            const data = JSON.parse(event.data)
            console.log('ws message:', data)
            if (data.offer) {
                console.log('收到 offer 并将其设置为远程描述')
                pc.setRemoteDescription(new RTCSessionDescription(data.offer))
                // 创建SDP answer并将其设置为本地描述, 发送给远程端
                pc.createAnswer().then(function (answer) {
                    pc.setLocalDescription(answer)
                    ws.send(JSON.stringify({ answer }))
                })
                return
            }
            if (data.answer) {
                console.log('收到 answer 并将其设置为远程描述')
                pc.setRemoteDescription(new RTCSessionDescription(data.answer))
                return
            }
            if (data.candidate) {
                console.log('收到 candidate 并将其添加到远程端')
                pc.addIceCandidate(new RTCIceCandidate(data.candidate))
            }
        }
        ws.onclose = function () {
            console.log('ws close')
        }

        setTimeout(() => {

            // 获取本地视频流
            navigator.mediaDevices.getUserMedia({ audio: false, video: true }).then(stream => {
                // 创建本地视频元素
                const localVideo = document.createElement('video')
                localVideo.srcObject = stream
                localVideo.autoplay = true
                localVideo.muted = true
                document.body.appendChild(localVideo)

                // 添加本地视频流到 RTCPeerConnection
                stream.getTracks().forEach(function (track) {
                    pc.addTrack(track, stream)
                })

                // 监听 ICE candidate 事件
                pc.onicecandidate = function (event) {
                    if (event.candidate) {
                        // 发送 ICE candidate 到远程端
                        ws.send(JSON.stringify({ candidate: event.candidate }))
                    }
                }

                // 监听远程视频流事件
                pc.ontrack = function (event) {
                    // 创建远程视频元素
                    var remoteVideo = document.createElement('video')
                    remoteVideo.srcObject = event.streams[0]
                    remoteVideo.autoplay = true
                    document.body.appendChild(remoteVideo)
                }

                // 创建SDP offer并将其设置为本地描述, 发送给远程端
                pc.createOffer().then(function (offer) {
                    pc.setLocalDescription(offer)
                    ws.send(JSON.stringify({ offer }))
                })

            }).catch(error => {
                console.log(error)
            })

        }, 1000)
    </script>
```