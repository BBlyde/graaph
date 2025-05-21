import User from './views/User.vue'

export const routes = [
    {path: '/User/:id', component: User, props: true}
]