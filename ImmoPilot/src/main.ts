import './assets/main.css';

import { createApp } from "vue";
import { createPinia } from "pinia";
import { createAuth0 } from '@auth0/auth0-vue';

import App from "./App.vue";

const app = createApp(App);

app.use(createPinia());

app.use(
  createAuth0({
    domain: "organimmo.eu.auth0.com",
    clientId: "2ITmJfmJ1Ra0NQsSEHT2v6tkATqs5dCh",
    authorizationParams: {
      redirect_uri: window.location.origin,
      audience: "https://vives-chatbot.organimmo.com",
      scope: "openid profile email",
    }
  })
);

app.mount("#app");
