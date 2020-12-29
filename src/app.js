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

    addNeighbour(neighbourRouter, dist) {
        this.neighbours.push(new Neighbour(neighbourRouter, dist))
    }
}

function geometryDist(r1, r2) {
    return Math.sqrt((r1.x - r2.x) ** 2 + (r1.y - r2.y) ** 2)
}

class RouterMap {
    routers = []

    constructor(canvasSelector) {
        //初始化 ZRender 实例
        let canvas = document.querySelector(canvasSelector)
        if(canvas)
            this.zrenderInst = zrender.init(canvas)
        else
            throw new Error(`Can't find Element by selector '${canvasSelector}'.`)
    }

    init(nodeAmount = 32) {
        this.routers = []
        //随机生成 Router
        for(let i = 0; i < nodeAmount; i++) {
            let x = Math.random() * 500
            let y = Math.random() * 500
            let router = new Router(`R${i}`, x, y)
            this.routers.push(router)
        }

        //建立 Router 之间的邻接关系
        for(let i = 0; i < this.routers.length; i++) {
            for(let j = i + 1; j < this.routers.length; j++) {
                let r1 = this.routers[i]
                let r2 = this.routers[j]
                let dist = geometryDist(r1, r2)
                if(dist < Router.radius) {
                    r1.addNeighbour(r2, dist)
                    r2.addNeighbour(r1, dist)
                }
            }
        }

        //绘图
        this.zrenderInst.clear()
        this.routers.forEach(router => {
            //绘制 Router
            let circular = new zrender.Circle({
                shape: {
                    cx: router.x,
                    cy: router.y,
                    r: 5
                },
                style: {
                    fill: '#01DF01',
                    stroke: '#01DF01'
                },
                zlevel: 10
            })
            //处理 Router 点击事件
            circular.on('click', (event) => {
                console.info(
                    `Router Name: ${router.name}\n` + 
                    `x: ${router.x}\n` +
                    `y: ${router.y}\n`
                )
            })
            this.zrenderInst.add(circular)

            //绘制 Router 之间的连线
            router.neighbours.forEach(neighbour => {
                let line = new zrender.Line({
                    style: {
                        stroke: '#48DD22'
                    },
                    shape: {
                        x1: router.x,
                        y1: router.y,
                        x2: neighbour.router.x,
                        y2: neighbour.router.y
                    }
                })
                //处理连线的点击事件
                line.on('click', (event) => {
                    console.info(
                        `distance: ${neighbour.dist}`
                    )
                })
                this.zrenderInst.add(line)
            })
        })
    }
}

//创建 RouterMap
const rm = new RouterMap('#main-canvas')
//初始化 RouterMap
rm.init()

