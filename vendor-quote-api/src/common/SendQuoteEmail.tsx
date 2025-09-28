export async function sendQuoteEmail(quoteId: number): Promise<any> {
  try {
    const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/quotes/${quoteId}/email`;
    console.log("🚀 Sending email request to:", apiUrl);
    console.log("🔍 Quote ID:", quoteId);
    console.log("🌐 API Base URL:", import.meta.env.VITE_API_BASE_URL);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("📡 Response status:", response.status);
    console.log("📡 Response ok:", response.ok);
    
    if (!response.ok) {
      let errorMessage = "Failed to send email";
      
      try {
        const error = await response.json();
        console.error("❌ Email API error response:", error);
        errorMessage = error.detail || error.message || errorMessage;
      } catch {
        // If we can't parse the error response, use status text
        errorMessage = `${response.status}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("✅ Email API success response:", result);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error occurred while sending email");
  }
}