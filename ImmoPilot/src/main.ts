import './assets/main.css';

import { createApp } from "vue";
import { createPinia } from "pinia";
import { createAuth0 } from '@auth0/auth0-vue';

import App from "./App.vue";

const app = createApp(App);

app.use(createPinia());

app.use(
  createAuth0({
    domain: "dev-o514fw216cq70tfu.eu.auth0.com",
    clientId: "LSQoSMLiOgNI2AOJsU58XEB8VTlPwLTe",
    authorizationParams: {
      redirect_uri: window.location.origin,
      audience: "https://localhost:7023/api/OpenAI",
    }
  })
);

app.mount("#app");
