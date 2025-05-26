import { createRouter, createWebHistory } from 'vue-router'
import PlayerPage from '@/views/PlayerPage.vue'
import HomePage from '@/views/HomePage.vue'

const routes = [
  {
    path: '/',
    name: 'HomePage',
    component: HomePage
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
  routes
})

export default router