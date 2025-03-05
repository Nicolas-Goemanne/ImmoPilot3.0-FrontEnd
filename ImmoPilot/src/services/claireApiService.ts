import { useTokenStore } from "@/stores/tokenStore";

const CLAIRE_BASE_URL = "https://app-prt-claire-prd-weu-backend.azurewebsites.net";

function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1]; // Haal het payload-gedeelte op
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); // JWT codering fix
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload); // ✅ Geef de gedecodeerde payload terug
  } catch (e) {
    console.error("❌ Kan JWT-token niet decoderen:", e);
    return null;
  }
}


export async function fetchClaireResponse(userMessage: string) {
  const tokenStore = useTokenStore();

  // ✅ Zorg dat Claire-token beschikbaar is
  if (!tokenStore.claireToken) {
    console.info("🔄 Claire-token ontbreekt, ophalen...");
    await tokenStore.fetchClaireToken();
  }

  if (!tokenStore.claireToken) {
    console.error("❌ Claire API-token niet beschikbaar.");
    return null;
  }

  // ✅ Decodeer het JWT-token om de `sub` (userId) te verkrijgen
  const decodedToken = decodeJwt(tokenStore.claireToken);
  if (!decodedToken || !decodedToken.sub) {
    console.error("❌ Kan geen geldige userId vinden in JWT-token:", decodedToken);
    return null;
  }
  const userId = decodedToken.sub; // ✅ Dit is de juiste Auth0 userId

  try {
    console.log("🔍 Verstuur bericht naar Claire API met token:", tokenStore.claireToken, "en userId:", userId);

    // ✅ Correcte payload voor de Claire API
    const requestBody = {
      userId: userId, // ✅ Gebruik de `sub` uit het JWT-token
      sessionId: 144, // ⚠️ Moet mogelijk dynamisch worden bepaald (voor nu hardcoded)
      message: {
        parentId: null, // Optioneel, mag null zijn
        userMessage: userMessage // Het bericht van de gebruiker
      },
      productNames: [],
      documentTypes: []
    };

    console.log("📡 Verzenden naar Claire API:", requestBody);

    // Maak de request naar de Claire API
    const response = await fetch(`${CLAIRE_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenStore.claireToken}`, // Zorg dat Claire-token correct is
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody) // Stuur de correcte body mee
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Claire API request failed: ${response.status} - ${errorText}`);
      throw new Error(`Fout bij Claire API: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("⚠️ Fout bij Claire API-aanroep:", error);
    return null;
  }
}
