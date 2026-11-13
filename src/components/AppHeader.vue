<template>
    <header class="border-b border-white/10 bg-[#101011] text-white">
        <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
            <router-link to="/" class="logo-link shrink-0" aria-label="Graaph - Accueil">
                <img src="@/assets/logo.png" alt="Graaph" class="h-8 w-auto sm:h-9" />
            </router-link>

            <nav aria-label="Main navigation" class="flex items-center gap-1 sm:gap-2">
                <router-link to="/" class="nav-link">GRAAPH</router-link>
                <router-link to="/stats" class="nav-link">STATS</router-link>
                <router-link to="/player" class="nav-link">PLAYER</router-link>
                <router-link to="/versus" class="nav-link">VERSUS</router-link>
                <router-link to="/leaderboard" class="nav-link">LEADERBOARD</router-link>
            </nav>
        </div>
    </header>
</template>

<style scoped>
.nav-link {
    border-bottom: 2px solid transparent;
    color: #a1a1aa;
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    padding: 1.25rem 0.4rem;
    transition: color 150ms ease, border-color 150ms ease;
}

.logo-link img {
    transition: transform 180ms ease;
}

.logo-link:hover img {
    transform: scale(1.05) rotate(-2deg);
}

.logo-link:active img {
    transform: scale(0.96);
}

.logo-link:focus-visible {
    outline: 2px solid #27ae60;
    outline-offset: 4px;
}

.nav-link:hover {
    border-color: rgb(255 255 255 / 0.3);
    color: white;
}

.nav-link:focus-visible {
    outline: 2px solid #27ae60;
    outline-offset: -2px;
}

.active-link {
    border-color: #27ae60;
    color: #27ae60;
}

@media (prefers-reduced-motion: reduce) {
    .logo-link img {
        transition: none;
    }
}

@media (min-width: 640px) {
    .nav-link {
        padding-right: 0.75rem;
        padding-left: 0.75rem;
    }
}
</style>