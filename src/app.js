/**
 * 路由类
 */
class Router {
    constructor(name, x, y) {
        this.name = name
        this.x = x
        this.y = y
    }

    neighbours = []
    routeTable = []
    
    addNeighbour(neighbourRouter, dist) {
        this.neighbours.push({ router: neighbourRouter, dist })
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
            //下一跳不同，且新路由项可以缩短距离
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



/**
 * ZRender 实例
 */
const zrenderInst = zrender.init(document.querySelector('#main-canvas'))

/**
 * 全局状态，使用 Proxy 代理
 */
const globalState = new Proxy({
    status: 0,
    routers: [],
    startRouter: null,
    endRouter: null,
    route: null,
}, {
    set: function(obj, prop, value) {
        //startRouter, endRouter 和 route 被更新的同时也更新 DOM
        obj[prop] = value
        if(prop === 'startRouter') {
            let el = document.querySelector("#start-router-digest")
            if(!obj.startRouter) {
                el.innerHTML = '尚未选择'
                return
            }
            el.innerHTML = 
                `Router Name: ${obj.startRouter.name}<br>` + 
                `Position-X: ${obj.startRouter.x}<br>` +
                `Position-Y: ${obj.startRouter.y}<br>`
        } else if(prop === 'endRouter') {
            let el = document.querySelector("#end-router-digest")
            if(!obj.endRouter) {
                el.innerHTML = '尚未选择'
                return
            }
            el.innerHTML = 
                `Router Name: ${obj.endRouter.name}<br>` + 
                `Position-X: ${obj.endRouter.x}<br>` +
                `Position-Y: ${obj.endRouter.y}<br>`
        } else if(prop === 'route') {
            let el = document.querySelector("#route-digest")
            if(!obj.route) {
                el.innerHTML = '请选择起点与终点'
                return
            }
            if(obj.route.length === 0) {
                el.innerHTML = '起点与终点之间不存在通路'
                return
            }
            el.innerHTML = obj.route.map(r => r.name).join(' -> ')
        }
        return true
    }
})



/**
 * 绘图函数
 */
const useCanvas = () => {
    const routers = globalState.routers
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
            if(globalState.status === 0) {
                //更新状态
                globalState.status = 1
                globalState.startRouter = router
                //起点高亮显示
                circular.turnRed()
            } else if(globalState.status === 1) {
                //更新状态
                globalState.status = 2
                globalState.endRouter = router
                globalState.route = globalState.startRouter.routeTo(globalState.endRouter)
                //如果没有通路，则对起点和终点蓝色高亮
                if(globalState.route.length === 0) {
                    circularMap[globalState.startRouter.name].turnBlue()
                    circularMap[globalState.endRouter.name].turnBlue()
                }
                //如果有通路，则对路径上所有点和线红色高亮
                else {
                    for(let i = 0; i < globalState.route.length; i++) {
                        let r = globalState.route[i]
                        let next = globalState.route[i + 1]
                        circularMap[r.name].turnRed()
                        if(next) {
                            lineMap[`${r.name}-${next.name}`].turnRed()
                        }
                    }
                }
            } else if(globalState.status === 2) {
                //高亮路径恢复为普通颜色
                if(globalState.route.length === 0) {
                    circularMap[globalState.startRouter.name].turnGreen()
                    circularMap[globalState.endRouter.name].turnGreen()
                } else {
                    for(let i = 0; i < globalState.route.length; i++) {
                        let r = globalState.route[i]
                        let next = globalState.route[i + 1]
                        circularMap[r.name].turnGreen()
                        if(next) {
                            lineMap[`${r.name}-${next.name}`].turnGreen()
                        }
                    }
                }
                //再对新的起点进行高亮显示
                circular.turnRed()
                //更新状态
                globalState.status = 1
                globalState.endRouter = null
                globalState.route = null
                globalState.startRouter = router
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

/**
 * 初始化函数
 * @param {Number} routerAmount 要生成的路由数量
 * @param {Number} radius 判定邻接路由的半径
 */
const init = (routerAmount = 50, radius = 100) => {
    //初始化全局状态
    globalState.status = 0
    globalState.routers = []
    globalState.startRouter = null
    globalState.endRouter = null
    globalState.route = null
    //随机生成 Router
    for(let i = 0; i < routerAmount; i++) {
        let x = Math.random() * 500
        let y = Math.random() * 500
        let router = new Router(`R${i}`, x, y)
        globalState.routers.push(router)
    }
    //建立 Router 之间的邻接关系
    for(let i = 0; i < globalState.routers.length; i++) {
        for(let j = i + 1; j < globalState.routers.length; j++) {
            let r1 = globalState.routers[i]
            let r2 = globalState.routers[j]
            let dist = Math.sqrt((r1.x - r2.x) ** 2 + (r1.y - r2.y) ** 2)  //几何距离
            if(dist < radius) {
                r1.addNeighbour(r2, dist)
                r2.addNeighbour(r1, dist)
            }
        }
    }
    //开始生成路由表
    globalState.routers.forEach(router => {
        router.sendRouteTable()
    })
    //绘图
    useCanvas()
}



//执行初始化函数，开始运行
init()