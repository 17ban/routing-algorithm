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
            `Position-X: ${startRouter.x}<br>` +
            `Position-Y: ${startRouter.y}<br>`
    } else if(target === 'endRouter') {
        let el = document.querySelector("#end-router-digest")
        if(!endRouter) {
            el.innerHTML = '尚未选择'
            return
        }
        el.innerHTML = 
            `Router Name: ${endRouter.name}<br>` + 
            `Position-X: ${endRouter.x}<br>` +
            `Position-Y: ${endRouter.y}<br>`
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
        el.innerHTML = route.map(r => r.name).join(' -> ')
    }
}

function geometryDist(r1, r2) {
    return Math.sqrt((r1.x - r2.x) ** 2 + (r1.y - r2.y) ** 2)
}

const useCanvas = (routers, zrenderInst) => {
    //储存 Router 与点、线之间的对应关系
    const circularMap = {}
    const lineMap = {}
    //开始绘图
    zrenderInst.clear()
    routers.forEach(router => {
        //---绘制圆点---//
        //创建圆点实例，添加颜色改变方法
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
        //处理圆点的点击事件
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
        zrenderInst.add(circular)

        //---绘制圆点之间的连线---//
        router.neighbours.forEach(neighbour => {
            //检查连线是否已经生成，是则不再生成新的连线
            if(lineMap[`${router.name}-${neighbour.router.name}`])
                return
            //创建连线实例，添加颜色改变方法
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
            zrenderInst.add(line)
        })
    })
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

    routeTable = []
    neighbours = []

    addNeighbour(neighbourRouter, dist) {
        this.neighbours.push(new Neighbour(neighbourRouter, dist))
        this.routeTable.push([neighbourRouter, dist, neighbourRouter])
    }

    sendRouteTable() {
        //用自己的路由表对每个邻居的路由表进行更新
        this.neighbours.forEach(neighbour => {
            neighbour.router.updateRouteTable(this.routeTable, this)
        })
    }

    updateRouteTable(neighbourRouteTable, from) {
        //标记 routeTable 是否已更新
        let updatedFlag = false
        //获取与来源邻居之间的距离
        let distToFrom = this.neighbours.find(n => n.router === from).dist
        //尝试更新 routeTable
        neighbourRouteTable.forEach(routeItem => {
            let targetRouter = routeItem[0]
            let newDist = routeItem[1] + distToFrom
            if(targetRouter === this) return
            let targetRouteItem = this.routeTable.find(i => i[0] === targetRouter)
            //若目标路由尚无记录
            if(!targetRouteItem) {
                //新建记录
                this.routeTable.push([targetRouter, routeItem[1] + distToFrom, from])
                updatedFlag = true
                return
            }
            //下一跳相同
            if(targetRouteItem[2] === from) {
                //若距离发生改变，更新距离
                if(Math.abs(targetRouteItem[1] - newDist) > 1e-9) {
                    targetRouteItem[1] = newDist
                    updatedFlag = true
                }
            }
            //下一跳不同，且新状态可以使距离缩短时
            else if(newDist < targetRouteItem[1]) {
                //更新距离与下一跳
                targetRouteItem[1] = newDist
                targetRouteItem[2] = from
                updatedFlag = true
            }
        })
        //若 routeTable 有更新，则向邻居路由推送新 routeTable
        if(updatedFlag) this.sendRouteTable()
    }

    routeTo(targetRouter) {
        //递归获取到达目标路由的路径
        if(targetRouter === this)
            return [this]
        let routeItem = this.routeTable.find(i => i[0] === targetRouter)
        if(!routeItem)
            return []
        return [this, ...routeItem[2].routeTo(targetRouter)]
    }
}

class RouterMap {
    routers = []
    zrenderInst = zrender.init(document.querySelector('#main-canvas'))

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
        //开始生成路由表
        this.routers.forEach(router => {
            router.sendRouteTable()
        })
        //绘图
        useCanvas(this.routers, this.zrenderInst)
    }
}

//创建 RouterMap
const rm = new RouterMap()
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