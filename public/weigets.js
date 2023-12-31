export function createElement({ innerText, textContent, onclick, onchange, children = [], dataset, style, classList = [], ...attributes }, tagName = 'div') {
    const element = document.createElement(tagName)
    for (const key in attributes) {
        element.setAttribute(key, attributes[key])
    }
    if (style) Object.assign(element.style, style)
    if (classList.length) element.classList.add(...classList)
    if (innerText) element.innerText = innerText
    if (textContent) element.textContent = textContent
    if (onclick) element.onclick = onclick
    if (onchange) element.onchange = onchange
    if (dataset) Object.keys(dataset).forEach(key => element.dataset[key] = dataset[key])
    if (children) children.forEach(child => element.appendChild(child))
    return element
}

export function List(options) {
    return createElement(options, 'ul')
}

export function ListItem(options) {
    return createElement(options, 'li')
}

export function Span(options) {
    return createElement(options, 'span')
}

export function Button(options) {
    return createElement(options, 'button')
}

export function Input(options) {
    return createElement(options, 'input')
}

export function Avatar(options) {
    const element = createElement(options, 'img')
    element.onerror = () => element.src = '/favicon.ico'
    return element
}

// 弹出窗口, 高斯模糊背景, 进入离开动画过渡
export function Dialog(options) {
    const element = createElement({}, 'div')
    const content = createElement(options)
    element.tabIndex = 0  // 使元素可以获得焦点
    element.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        z-index: 1000;
        width: 100%;
        height: 100%;
        backdrop-filter: blur(5px);
        duration: 0.5s;
        transition: all 0.5s;
    `
    content.classList.add('dialog')
    content.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #fff;
        border-radius: 150px;
        box-shadow: 0 0 1em #ccc;
        overflow: hidden;
        display: flex;
        justify-content: center;
    `
    element.appendChild(content)
    // 点击空白处关闭
    element.onclick = async event => {
        if (event.target === element) {
            await element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100 }).finished
            element.remove()
        }
    }
    // 按下 ESC 关闭
    element.onkeydown = async event => {
        if (event.key === 'Escape') {
            await element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100 }).finished
            element.remove()
        }
    }
    // 显示时自动聚焦
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                element.focus()
                element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 100 }).finished
                return
            }
        }
    })
    // 监听 Dialog 元素的插入, 在 Dialog 被移除时停止监听
    observer.observe(document.body, { childList: true, subtree: true })
    element.onremove = () => observer.disconnect()
    return element
}
