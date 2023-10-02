export function Button({ innerText, onclick }) {
    const button = document.createElement('button')
    button.innerText = innerText
    button.onclick = onclick
    return button
}

export function List({ children = [] }) {
    const ul = document.createElement('ul')
    children.forEach(child => ul.appendChild(child))
    return ul
}

export function ListItem({ innerText, onclick, children = [], dataset, classList = [], ...attributes }) {
    const element = document.createElement('li')
    for (const key in attributes) {
        element.setAttribute(key, attributes[key])
    }
    classList.forEach(item => element.classList.add(item))
    if (innerText) element.innerText = innerText
    if (onclick) element.onclick = onclick
    if (dataset) Object.keys(dataset).forEach(key => element.dataset[key] = dataset[key])
    if (children) children.forEach(child => element.appendChild(child))
    return element
}

export function Text({ innerText, onclick, children, dataset, classList, ...attributes }) {
    const element = document.createElement('span')
    if (classList) classList.forEach(item => element.classList.add(item))
    if (innerText) element.innerText = innerText
    if (onclick) element.onclick = onclick
    if (dataset) Object.keys(dataset).forEach(key => element.dataset[key] = dataset[key])
    if (children) children.forEach(child => element.appendChild(child))
    return element
}
