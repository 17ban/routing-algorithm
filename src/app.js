class Router {
    radius = 50
    constructor(name, x, y) {
        this.name = name
        this.x = x
        this.y = y
    }
}

function euclideanDistance(node_A, node_B) {
    return Math.sqrt((node_A.x - node_B.x) ** 2 + (node_A.y - node_B.y) ** 2)
}

function dist(node_A, node_B) {
    return euclideanDistance(node_A, node_B)
}

class RouterMap {
    nodes = []

    constructor(nodeAmount = 10) {
        for(let i = 0; i < nodeAmount; i++) {
            let x = Math.random() * 500
            let y = Math.random() * 500
            let node = new Router(`Node-${i}`, x, y)
            this.nodes.push(node)
        }
    }
}