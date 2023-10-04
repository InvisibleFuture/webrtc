export function createElement({ innerText, textContent, onclick, children = [], dataset, classList = [], ...attributes }, tagName = 'div') {
    const element = document.createElement(tagName)
    for (const key in attributes) {
        element.setAttribute(key, attributes[key])
    }
    if (classList.length) element.classList.add(...classList)
    if (innerText) element.innerText = innerText
    if (textContent) element.textContent = textContent
    if (onclick) element.onclick = onclick
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
