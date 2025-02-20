import { defineStore } from "pinia";
import { useAuth0 } from "@auth0/auth0-vue";
import { ref } from "vue";

export const useTokenStore = defineStore("tokenStore", () => {
  const { getAccessTokenSilently } = useAuth0();
  const token = ref<string | null>(null);

  async function fetchToken() {
    try {
      token.value = await getAccessTokenSilently();
    } catch (error) {
      console.error("Fout bij ophalen van access token:", error);
      token.value = null;
    }
  }

  return { token, fetchToken };
});
