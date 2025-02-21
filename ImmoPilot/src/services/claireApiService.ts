export async function fetchClaireResponse(userMessage: string) {
  try {
    const response = await fetch("https://app-prt-claire-prd-weu-backend.azurewebsites.net/chat", {
      method: "POST",
      headers: {
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

