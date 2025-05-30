import './assets/main.css'
import './assets/app.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index'

const app = createApp(App)
app.use(router).mount('#app')