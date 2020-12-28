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
    routers = []

    constructor(nodeAmount = 16) {
        for(let i = 0; i < nodeAmount; i++) {
            let x = Math.random() * 500
            let y = Math.random() * 500
            let router = new Router(`Node-${i}`, x, y)
            this.routers.push(router)
        }
    }
}


//初始化 ZRender 实例
const zr = zrender.init(document.getElementById('main-canvas'))
//创建 RouterMap
const rm = new RouterMap()

//绘制每个 Router
rm.routers.forEach(router => {
    zr.add(new zrender.Circle({
        shape: {
            cx: router.x,
            cy: router.y,
            r: 8
        },
        style: {
            fill: '#01DF01',
            stroke: '#01DF01'
        },
        draggable: true
    }))
})