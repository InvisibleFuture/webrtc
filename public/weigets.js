export function createElement({ innerText, textContent, onclick, children = [], dataset, classList = [], ...attributes }, tagName) {
    const element = document.createElement(tagName)
    for (const key in attributes) {
        element.setAttribute(key, attributes[key])
    }
    element.classList.add(...classList)
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
