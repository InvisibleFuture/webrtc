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

export function ListItem({ innerText, onclick, id, children = [], dataset, classList=[] }) {
    const li = document.createElement('li')
    classList.forEach(item => li.classList.add(item))
    li.innerText = innerText
    li.onclick = onclick
    li.id = id
    dataset && Object.keys(dataset).forEach(key => li.dataset[key] = dataset[key])
    children.forEach(child => li.appendChild(child))
    return li
}
