import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import StatsPage from '@/views/StatsPage.vue'
import PlayerHome from '@/views/PlayerHome.vue'
import PlayerStats from '@/views/PlayerStats.vue'

const routes = [
  {
    path: '/',
    name: 'HomePage',
    component: HomePage
  },
  {
    path: '/stats',
    name: 'Stats',
    component: StatsPage
  },
  {
    path: '/player',
    name: 'PlayerHome',
    component: PlayerHome
  },
  {
    path: '/player/:id',
    name: 'PlayerStats',
    component: PlayerStats,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  linkActiveClass: 'active-link'
})

export default router