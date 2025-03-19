<script setup>
import { useAuth0 } from "@auth0/auth0-vue";

const { loginWithRedirect } = useAuth0();

const login = () => {
  loginWithRedirect();
};
</script>

<template>
  <button @click="login" class="auth-btn login-btn">Login</button>
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
.login-btn {
  background-color: #124522;
  color: white;
  position: absolute;
  top: 20px;
  right: 20px;
}

/* 🔹 Hover-effect */
.login-btn:hover {
  opacity: 0.8;
}
</style>

