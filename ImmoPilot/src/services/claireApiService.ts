import { useTokenStore } from "@/stores/tokenStore";

export async function fetchClaireResponse(userMessage: string) {
  const tokenStore = useTokenStore();

  if (!tokenStore.claireToken) {
    console.error("❌ Claire API-token ontbreekt, ophalen...");
    await tokenStore.fetchClaireToken(); // Probeer token opnieuw op te halen
  }

  if (!tokenStore.claireToken) {
    console.error("❌ Claire API-token niet beschikbaar. Kan geen request uitvoeren.");
    return null;
  }

  try {
    const response = await fetch("https://app-prt-claire-prd-weu-backend.azurewebsites.net/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenStore.claireToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userMessage })
    });

    if (!response.ok) {
      throw new Error(`Fout bij Claire API: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("⚠️ Fout bij Claire API-aanroep:", error);
    return null;
  }
}


