<template>
    <header class="text-2xl" style="color:#7b7d7d;background-color:#1A1A1A;">
        <div class="px-4 py-4 flex justify-between items-center">
            <div class="flex-1">
                <img src="@/assets/logo.png" alt="Logo" class="h-12 w-auto" />
            </div>

            <nav class="flex-1 text-center space-x-6">
                <router-link to="/" class="hover:underline">Home</router-link>
                <router-link to="/Stats" class="hover:underline">Stats</router-link>
                <router-link to="/About" class="hover:underline">About</router-link>
            </nav>

            <div class="flex-1 text-right">
            </div>
        </div>
        <hr>
    </header>
</template>
<style>
.active-link {
    color: #27ae60;
}
</style>