import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import StatsPage from '@/views/StatsPage.vue'
import AboutPage from '@/views/AboutPage.vue'
import PlayerPage from '@/views/PlayerPage.vue'

const routes = [
  {
    path: '/',
    name: 'HomePage',
    component: HomePage
  },
  {
    path: '/Stats',
    name: 'Stats',
    component: StatsPage
  },
  {
    path: '/About',
    name: 'About',
    component: AboutPage
  },
  {
    path: '/player/:id',
    name: 'PlayerPage',
    component: PlayerPage,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  linkActiveClass: 'active-link'
})

export default router