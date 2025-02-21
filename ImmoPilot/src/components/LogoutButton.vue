<script setup>
import { useAuth0 } from '@auth0/auth0-vue';

const { logout } = useAuth0();

const handleLogout = () => {
  logout({ logoutParams: { returnTo: window.location.origin } });
};
</script>

<template>
  <button @click="logout" class="auth-btn logout-btn">Logout</button>
</template>

<style scoped>
/* 🔹 Basis styling */
.auth-btn {
  padding: 6px 12px;
  font-size: 14px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
}

/* 🔹 Login Knop */
.logout-btn {
  background-color: #5ff38e;
  color: white;
  position: absolute;
  top: 20px;
  right: 20px;
}

/* 🔹 Hover-effect */
.logout-btn:hover {
  opacity: 0.8;
}
</style>
