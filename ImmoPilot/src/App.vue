<script setup lang="ts">
import { useAuth0 } from "@auth0/auth0-vue";
import ChatBotBubble from './components/ChatBotBubble.vue';
import LoginButton from './components/LoginButton.vue';
import LogoutButton from './components/LogoutButton.vue';
import UserProfile from "./components/UserProfile.vue";

const { isAuthenticated } = useAuth0();

</script>

<template>
    <div>
    <LoginButton v-if="!isAuthenticated" />
    <LogoutButton v-if="isAuthenticated" />
    <UserProfile v-if="isAuthenticated" />
  </div>
  <div class="app">
    <ChatBotBubble />
  </div>
</template>






