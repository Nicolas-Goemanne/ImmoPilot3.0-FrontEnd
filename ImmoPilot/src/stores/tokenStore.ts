import { defineStore } from "pinia";
import { useAuth0 } from "@auth0/auth0-vue";
import { ref } from "vue";

export const useTokenStore = defineStore("tokenStore", () => {
  const { getAccessTokenSilently, loginWithPopup } = useAuth0();
  const token = ref<string | null>(null);
  const claireToken = ref<string | null>(null);

  async function fetchToken() {
    try {
      console.info("🔄 Fetching API token...");
      token.value = await getAccessTokenSilently();
      console.log("✅ API token retrieved:", token.value);
    } catch (error) {
      console.error("❌ Error fetching API token:", error);
      token.value = null;
    }
  }

  async function fetchClaireToken() {
    try {
      console.info("🔄 Fetching Claire API token...");

      const authParams = {
        audience: "https://claire-api.organimmo.com",
        scope: "openid profile email read:messages"
      };

      // ✅ Probeer eerst stilletjes een token op te halen zonder login-popup
      const tokenResult: string = await getAccessTokenSilently({
        authorizationParams: authParams
      }).catch(async (error) => {
        console.warn("⚠️ Silent token retrieval failed, requesting consent...", error);

        // ✅ Toon enkel de consent-popup als het stil ophalen faalt
        await loginWithPopup({
          authorizationParams: { ...authParams, prompt: "consent" }
        });

        // ✅ Haal het token opnieuw op na toestemming
        return await getAccessTokenSilently({ authorizationParams: authParams });
      });

      if (!tokenResult) {
        throw new Error("❌ Claire API token ophalen mislukt.");
      }

      claireToken.value = tokenResult;
      console.log("✅ Claire API token retrieved and stored:", claireToken.value);
    } catch (error) {
      console.error("❌ Error fetching Claire API token:", error);
      claireToken.value = null;
    }
  }

  return { token, claireToken, fetchToken, fetchClaireToken };
});
