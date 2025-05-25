import { createRouter, createWebHistory } from 'vue-router'
import PlayerPage from '@/views/PlayerPage.vue'

const routes = [
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