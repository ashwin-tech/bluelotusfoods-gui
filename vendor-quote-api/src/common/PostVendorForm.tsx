export async function postVendorForm(data: any): Promise<any> {
  try {
    const response = await fetch("http://127.0.0.1:8000/quotes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = "Failed to submit the form";
      
      try {
        const error = await response.json();
        errorMessage = error.detail || error.message || errorMessage;
      } catch {
        // If we can't parse the error response, use status text
        errorMessage = `${response.status}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error occurred while submitting the form");
  }
}
