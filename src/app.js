class Neighbour {
    constructor(router, dist) {
        this.router = router
        this.dist = dist
    }
}

class Router {
    static radius = 128

    neighbours = []
    constructor(name, x, y) {
        this.name = name
        this.x = x
        this.y = y
    }
}

function geometryDist(r1, r2) {
    return Math.sqrt((r1.x - r2.x) ** 2 + (r1.y - r2.y) ** 2)
}

class RouterMap {
    routers = []

    constructor(nodeAmount = 32) {
        for(let i = 0; i < nodeAmount; i++) {
            let x = Math.random() * 500
            let y = Math.random() * 500
            let router = new Router(`Node-${i}`, x, y)
            this.routers.push(router)
        }
        for(let i = 0; i < this.routers.length; i++) {
            for(let j = i + 1; j < this.routers.length; j++) {
                let r1 = this.routers[i]
                let r2 = this.routers[j]
                let dist = geometryDist(r1, r2)
                if(dist < Router.radius) {
                    r1.neighbours.push(new Neighbour(r2, dist))
                    r2.neighbours.push(new Neighbour(r1, dist))
                }
            }
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
            r: 5
        },
        style: {
            fill: '#01DF01',
            stroke: '#01DF01'
        }
    }))
    router.neighbours.forEach(neighbour => {
        zr.add(new zrender.Line({
            style: {
                stroke: '#48DD22'
            },
            shape: {
                x1: router.x,
                y1: router.y,
                x2: neighbour.router.x,
                y2: neighbour.router.y
            }
        }))
    })
})