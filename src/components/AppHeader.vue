<template>
    <header class="border-b border-white/10 bg-[#101011] text-white">
        <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
            <div class="shrink-0">
                <img src="@/assets/logo.png" alt="Graaph" class="h-8 w-auto sm:h-9" />
            </div>

            <nav aria-label="Main navigation" class="flex items-center gap-1 sm:gap-2">
                <router-link to="/" class="nav-link">GRAAPH</router-link>
                <router-link to="/stats" class="nav-link">STATS</router-link>
                <router-link to="/player" class="nav-link">PLAYER</router-link>
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

@media (min-width: 640px) {
    .nav-link {
        padding-right: 0.75rem;
        padding-left: 0.75rem;
    }
}
</style>