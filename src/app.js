//全局状态
let status = 0
let startRouter = null
let endRouter = null
let route = null

function updateDOM(target) {
    if(target === 'startRouter') {
        let el = document.querySelector("#start-router-digest")
        if(!startRouter) {
            el.innerHTML = '尚未选择'
            return
        }
        el.innerHTML = 
            `Router Name: ${startRouter.name}<br>` + 
            `x: ${startRouter.x}<br>` +
            `y: ${startRouter.y}<br>`
    } else if(target === 'endRouter') {
        let el = document.querySelector("#end-router-digest")
        if(!endRouter) {
            el.innerHTML = '尚未选择'
            return
        }
        el.innerHTML = 
            `Router Name: ${endRouter.name}<br>` + 
            `x: ${endRouter.x}<br>` +
            `y: ${endRouter.y}<br>`
    } else if(target === 'route') {
        let el = document.querySelector("#route-digest")
        if(!route) {
            el.innerHTML = '请选择起点与终点'
            return
        }
        if(route.length === 0) {
            el.innerHTML = '起点与终点之间不存在通路'
            return
        }
        el.innerHTML = route.map(r => r.name)
    }
}

function geometryDist(r1, r2) {
    return Math.sqrt((r1.x - r2.x) ** 2 + (r1.y - r2.y) ** 2)
}

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

    LSDB = []
    neighbours = []
    addNeighbour(neighbourRouter, dist) {
        this.neighbours.push(new Neighbour(neighbourRouter, dist))
        this.LSDB.push([neighbourRouter, dist, neighbourRouter])
    }
    pushLSDB() {
        this.neighbours.forEach(neighbour => {
            neighbour.router.updateLSDB(this.LSDB, this)
        })
    }
    updateLSDB(neighbourLSDB, from) {
        let updatedFlag = false

        //查找到更新路由的距离
        let distToFrom = this.neighbours.find(n => n.router === from).dist

        //更新 LSDB
        neighbourLSDB.forEach(stateItem => {
            let targetRouter = stateItem[0]
            if(targetRouter === this) {
                return
            }
            
            let targetStateItem = this.LSDB.find(oldStateItem => oldStateItem[0] === targetRouter)
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
                this.LSDB.push([targetRouter, stateItem[1] + distToFrom, from])
                updatedFlag = true
            }
        })

        //若 LSDB 有更新，则向邻居路由推送新 LSDB
        if(updatedFlag) {
            this.pushLSDB()
        }
    }
    routeTo(targetRouter) {
        if(targetRouter === this) {
            return [this]
        }
        let stateItem = this.LSDB.find(i => i[0] === targetRouter)
        if(!stateItem) {
            return []
        }
        let route = [this]
        route.push(...stateItem[2].routeTo(targetRouter))
        return route
    }
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
                    },
                    zlevel: 20
                })
            }
            circular.turnBlue = function() {
                this.attr({
                    style: {
                        fill: '#2222FF',
                        stroke: '#2222FF'
                    },
                    zlevel: 20
                })
            }
            circular.turnGreen = function() {
                this.attr({
                    style: {
                        fill: '#01DF01',
                        stroke: '#01DF01'
                    },
                    zlevel: 10
                })
            }
            //处理 Router 点击事件
            circular.on('click', (event) => {
                if(status === 0) {
                    //更新状态
                    status = 1
                    startRouter = router
                    //起点高亮显示
                    circular.turnRed()
                    //更新DOM
                    updateDOM('startRouter')
                } else if(status === 1) {
                    //更新状态
                    status = 2
                    endRouter = router
                    route = startRouter.routeTo(endRouter)
                    //如果没有通路，则对起点和终点蓝色高亮
                    if(route.length === 0) {
                        circularMap[startRouter.name].turnBlue()
                        circularMap[endRouter.name].turnBlue()
                    }
                    //如果有通路，则对路径上所有点和线红色高亮
                    else {
                        for(let i = 0; i < route.length; i++) {
                            let r = route[i]
                            let next = route[i + 1]
                            circularMap[r.name].turnRed()
                            if(next) {
                                lineMap[`${r.name}-${next.name}`].turnRed()
                            }
                        }
                    }
                    //更新DOM
                    updateDOM('endRouter')
                    updateDOM('route')
                } else if(status === 2) {
                    //高亮路径恢复为普通颜色
                    if(route.length === 0) {
                        circularMap[startRouter.name].turnGreen()
                        circularMap[endRouter.name].turnGreen()
                    } else {
                        for(let i = 0; i < route.length; i++) {
                            let r = route[i]
                            let next = route[i + 1]
                            circularMap[r.name].turnGreen()
                            if(next) {
                                lineMap[`${r.name}-${next.name}`].turnGreen()
                            }
                        }
                    }
                    //再对新的起点进行高亮显示
                    circular.turnRed()
                    //更新状态
                    status = 1
                    endRouter = null
                    route = null
                    startRouter = router
                    //更新DOM
                    updateDOM('startRouter')
                    updateDOM('endRouter')
                    updateDOM('route')
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
                        },
                        zlevel: 15
                    })
                }
                line.turnGreen = function() {
                    this.attr({
                        style: {
                            stroke: '#48DD22'
                        },
                        zlevel: 0
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

window.reset = () => {
    //重置状态
    status = 0
    startRouter = null
    endRouter = null
    route = null
    rm.init()
    //更新DOM
    updateDOM('startRouter')
    updateDOM('endRouter')
    updateDOM('route')
}