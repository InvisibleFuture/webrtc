// 使用示例：
// const db = new IndexedDB('myDatabase', 1, 'myStore')
// await db.open()
// await db.add({ id: 1, name: 'John' })
// const data = await db.get(1)
// console.log(data)
// await db.delete(1)

export default class IndexedDB {
    constructor(databaseName, databaseVersion, storeName) {
        this.databaseName = databaseName
        this.databaseVersion = databaseVersion
        this.storeName = storeName
        this.db = null
    }

    open() {
        console.log('open')
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.databaseName, this.databaseVersion)
            request.onerror = (event) => {
                reject(event.target.error)
            }
            request.onsuccess = (event) => {
                this.db = event.target.result
                resolve(this.db)
            }
            request.onupgradeneeded = (event) => {
                const db = event.target.result
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' })
                }
            }
        })
    }

    add(data) {
        console.log('add', data)
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite')
            const objectStore = transaction.objectStore(this.storeName)

            // 判断是否已经存在
            const request = objectStore.get(data.id)
            request.onerror = (event) => {
                reject(event.target.error)
            }
            request.onsuccess = (event) => {
                if (event.target.result) return resolve(event.target.result)
                const request = objectStore.add(data)
                request.onerror = (event) => {
                    reject(event.target.error)
                }
                request.onsuccess = (event) => {
                    resolve(event.target.result)
                }
            }
        })
    }

    get(id) {
        console.log('get', id)
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly')
            const objectStore = transaction.objectStore(this.storeName)
            const request = objectStore.get(id)

            request.onerror = (event) => {
                reject(event.target.error)
            }

            request.onsuccess = (event) => {
                resolve(event.target.result)
            }
        })
    }

    getAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly')
            const objectStore = transaction.objectStore(this.storeName)
            const request = objectStore.getAll()

            request.onerror = (event) => {
                reject(event.target.error)
            }

            request.onsuccess = (event) => {
                resolve(event.target.result)
            }
        })
    }

    delete(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite')
            const objectStore = transaction.objectStore(this.storeName)
            const request = objectStore.delete(id)

            request.onerror = (event) => {
                reject(event.target.error)
            }

            request.onsuccess = (event) => {
                resolve(event.target.result)
            }
        })
    }
}
