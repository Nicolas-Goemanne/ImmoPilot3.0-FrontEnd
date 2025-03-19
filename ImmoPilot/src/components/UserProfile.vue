<script setup>
import { useAuth0 } from "@auth0/auth0-vue";

const { user, isAuthenticated } = useAuth0();
</script>

<template>
  <div v-if="isAuthenticated" class="user-info">
    <span class="user-email">{{ user.email }}</span>
    <LogoutButton />
  </div>
</template>


<style scoped>
/* 🔹 User Info (naast de logout knop) */
.user-info {
  position: absolute;
  top: 25px;
  right:100px;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 🔹 Groene username */
.user-email {
  font-size: 14px;
  font-weight: bold;
  color: #124522;
}
</style>

