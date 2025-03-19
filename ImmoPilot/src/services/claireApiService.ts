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
      userId: userId,
      sessionId: 144,
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

    const responseData = await response.json();
    const answer = responseData.response || "Geen antwoord ontvangen.";

    // ✅ Vraag Claire voor follow-up vragen
    const followups = await fetchClaireFollowups(userId, answer);

    return { response: answer, followup: followups };
  } catch (error) {
    console.error("⚠️ Fout bij Claire API-aanroep:", error);
    return null;
  }
}

async function fetchClaireFollowups(userId: string, lastAnswer: string) {
  const tokenStore = useTokenStore();
  if (!tokenStore.claireToken) {
    console.error("❌ Claire API-token niet beschikbaar voor follow-ups.");
    return [];
  }

  try {
    const followupRequestBody = {
      userId: userId,
      sessionId: 144,
      message: {
        parentId: null,
        userMessage: `Op basis van dit antwoord: "${lastAnswer}" genereer drie relevante vervolgvragen zonder uitleg.`
      },
      productNames: [],
      documentTypes: []
    };

    console.log("📡 Vervolgvragen ophalen van Claire:", followupRequestBody);

    const followupResponse = await fetch(`${CLAIRE_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenStore.claireToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(followupRequestBody)
    });

    if (!followupResponse.ok) {
      console.warn("⚠️ Claire API gaf geen correcte vervolgvragen terug.");
      return [];
    }

    const followupData = await followupResponse.json();
    return parseFollowupQuestions(followupData.response || "");
  } catch (error) {
    console.error("❌ Fout bij ophalen van Claire follow-ups:", error);
    return [];
  }
}

function parseFollowupQuestions(text: string): string[] {
  return text
    .split("\n")
    .map(q => q.replace(/^\d+[\.\)]?\s*/, "").trim())
    .map(q => q.split(" ").slice(0, 10).join(" "))
    .slice(0, 3);
}

