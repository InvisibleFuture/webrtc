export function List({ innerText, textContent, onclick, children = [], dataset, classList = [], ...attributes }) {
    const element = document.createElement('ul')
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

export function ListItem({ innerText, textContent, onclick, children = [], dataset, classList = [], ...attributes }) {
    const element = document.createElement('li')
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

export function Span({ innerText, textContent, onclick, children = [], dataset, classList = [], ...attributes }) {
    const element = document.createElement('span')
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

export function Button({ innerText, textContent, onclick, children = [], dataset, classList = [], ...attributes }) {
    const element = document.createElement('button')
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
