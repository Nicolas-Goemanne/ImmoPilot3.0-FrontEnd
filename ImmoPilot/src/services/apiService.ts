export async function fetchProtectedData(token: string, question: string, agent: string) {
  if (!token) {
    console.error("Geen token beschikbaar!");
    return null;
  }

  try {
    const response = await fetch("https://localhost:7023/api/ImmoPilot/ask", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: question,
        agent: agent,
      }),
    });

    if (!response.ok) {
      throw new Error("API request failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching protected data:", error);
    return null;
  }
}



