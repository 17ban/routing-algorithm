class Neighbour {
    constructor(router, dist) {
        this.router = router
        this.dist = dist
    }
}

class Router {
    static radius = 100

    constructor(name, x, y) {
        this.name = name
        this.x = x
        this.y = y
    }

    linkStateDataBase = []
    neighbours = []
    addNeighbour(neighbourRouter, dist) {
        this.neighbours.push(new Neighbour(neighbourRouter, dist))
        this.linkStateDataBase.push([neighbourRouter, dist, neighbourRouter])
    }
    pushLSDB() {
        this.neighbours.forEach(neighbour => {
            neighbour.router.updateLSDB(this.linkStateDataBase, this)
        })
    }
    updateLSDB(LSDB, from) {
        let updatedFlag = false

        //查找到更新路由的距离
        let distToFrom = this.neighbours.find(n => n.router === from).dist

        //更新记录
        LSDB.forEach(stateItem => {
            let targetRouter = stateItem[0]
            if(targetRouter === this) {
                return
            }
            
            let targetStateItem = this.linkStateDataBase.find(oldStateItem => oldStateItem[0] === targetRouter)
            //目标路由已有记录
            if(targetStateItem) {
                let newDist = stateItem[1] + distToFrom
                //下一跳相同
                if(targetStateItem[2] === from) {
                    //若距离发生改变，更新距离
                    if(Math.abs(targetStateItem[1] - newDist) > 1e-9) {
                        targetStateItem[1] = newDist
                        updatedFlag = true
                    }
                }
                //下一跳不同，且新状态可以使距离缩短时
                else if(newDist < targetStateItem[1]) {
                    //更新距离与下一跳
                    targetStateItem[1] = newDist
                    targetStateItem[2] = from
                    updatedFlag = true
                }
            }
            //目标路由尚无记录
            else {
                //新建记录
                this.linkStateDataBase.push([targetRouter, stateItem[1] + distToFrom, from])
                updatedFlag = true
            }
        })

        //若有更新，则向邻居路由推送新状态
        if(updatedFlag) {
            //console.log(`${this.name} updated.`)
            this.pushLSDB()
        } else {
            //console.log(`${this.name} LSDB clean.`)
        }
    }
    routeTo(targetRouter) {
        if(targetRouter === this) {
            return [this]
        }
        let stateItem = this.linkStateDataBase.find(i => i[0] === targetRouter)
        if(!stateItem) {
            return []
        }
        let route = [this]
        route.push(...stateItem[2].routeTo(targetRouter))
        return route
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

    init(nodeAmount = 50) {
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

        //更新链路状态
        this.routers.forEach(router => {
            router.pushLSDB()
        })


        //绘图相关状态
        let status = 0
        let startRouter = null
        let endRouter = null
        let route = null
        const circularMap = {}
        const lineMap = {}

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
            circular.turnRed = function() {
                this.attr({
                    style: {
                        fill: '#FF0000',
                        stroke: '#FF0000'
                    }
                })
            }
            circular.turnGreen = function() {
                this.attr({
                    style: {
                        fill: '#01DF01',
                        stroke: '#01DF01'
                    }
                })
            }
            //处理 Router 点击事件
            circular.on('click', (event) => {
                console.info(
                    `Router Name: ${router.name}\n` + 
                    `x: ${router.x}\n` +
                    `y: ${router.y}\n`
                )
                if(status === 0) {
                    status = 1
                    startRouter = router
                    circular.turnRed()
                } else if(status === 1) {
                    status = 2
                    endRouter = router
                    circularMap[startRouter.name].turnGreen()
                    route = startRouter.routeTo(endRouter)
                    for(let i = 0; i < route.length; i++) {
                        let r = route[i]
                        let next = route[i + 1]
                        circularMap[r.name].turnRed()
                        if(next) {
                            lineMap[`${r.name}-${next.name}`].turnRed()
                        }
                    }
                    route.forEach(r => {
                        circularMap[r.name].turnRed()
                    })
                } else if(status === 2) {
                    status = 1
                    for(let i = 0; i < route.length; i++) {
                        let r = route[i]
                        let next = route[i + 1]
                        circularMap[r.name].turnGreen()
                        if(next) {
                            lineMap[`${r.name}-${next.name}`].turnGreen()
                        }
                    }
                    startRouter = router
                    circular.turnRed()
                }
            })
            circularMap[router.name] = circular
            this.zrenderInst.add(circular)

            //绘制 Router 之间的连线
            router.neighbours.forEach(neighbour => {
                //检查连线是否已经生成，是则不再生成新的连线
                if(lineMap[`${router.name}-${neighbour.router.name}`])
                    return

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
                line.turnRed = function() {
                    this.attr({
                        style: {
                            stroke: '#FF3333'
                        }
                    })
                }
                line.turnGreen = function() {
                    this.attr({
                        style: {
                            stroke: '#48DD22'
                        }
                    })
                }
                //处理连线的点击事件
                line.on('click', (event) => {
                    console.info(
                        `distance: ${neighbour.dist}`
                    )
                })
                lineMap[`${router.name}-${neighbour.router.name}`] = line
                lineMap[`${neighbour.router.name}-${router.name}`] = line
                this.zrenderInst.add(line)
            })
        })
    }
}

//创建 RouterMap
const rm = new RouterMap('#main-canvas')
//初始化 RouterMap
rm.init()

