import Router from 'koa-router'
import home from '../controllers/home'

const router = new Router({
  prefix: '/home'
})

router.get('/getHomeMess', home.getHomeData)

export default router