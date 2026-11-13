<template>
    <header class="text-2xl" style="color:#7b7d7d;background-color:#1A1A1A;">
        <div class="px-4 py-4 flex justify-between items-center">
            <div class="flex-1">
                <img src="@/assets/logo.png" alt="Logo" class="h-12 w-auto" />
            </div>

            <nav class="flex-1 text-center space-x-6">
                <router-link to="/" class="hover:underline">HOME</router-link>
                <router-link to="/stats" class="hover:underline">STATS</router-link>
                <router-link to="/player" class="hover:underline">PLAYER</router-link>
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