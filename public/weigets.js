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

export function ListItem({ innerText, onclick, id, children = [] }) {
    const li = document.createElement('li')
    li.innerText = innerText
    li.onclick = onclick
    li.id = id
    children.forEach(child => li.appendChild(child))
    return li
}
