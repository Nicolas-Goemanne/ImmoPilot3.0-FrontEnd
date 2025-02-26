import { defineStore } from "pinia";
import { useAuth0 } from "@auth0/auth0-vue";
import { ref } from "vue";

export const useTokenStore = defineStore("tokenStore", () => {
  const { getAccessTokenSilently, loginWithPopup } = useAuth0();
  const token = ref<string | null>(null);
  const claireToken = ref<string | null>(null);

  async function fetchToken() {
    try {
      token.value = await getAccessTokenSilently({
        // Ensure the correct audience and scope are set if needed
      });
    } catch (error) {
      console.error("Error fetching access token silently:", error);
      token.value = null;
    }
  }

  async function fetchClaireToken() {
    try {
      await loginWithPopup({
        authorizationParams: {
          audience: "https://claire-api.organimmo.com",
          scope: "openid profile email read:messages"
        }
      });
      const response = await fetch("https://app-prt-claire-prd-weu-backend.azurewebsites.net/authorize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: "2ITmJfmJ1Ra0NQsSEHT2v6tkATqs5dCh",
          redirect_uri: window.location.origin,
          response_type: "token",
          scope: "openid profile email read:messages",
          audience: "https://claire-api.organimmo.com"
        })
      });

      if (!response.ok) {
        throw new Error("Error fetching Claire API token");
      }

      const data = await response.json();
      claireToken.value = data.access_token;
      console.log("✅ Claire API token retrieved:", claireToken.value);
    } catch (error) {
      console.error("⚠️ Error fetching Claire API token:", error);
      claireToken.value = null;
    }
  }

  return { token, claireToken, fetchToken, fetchClaireToken };
});