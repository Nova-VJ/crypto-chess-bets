const urlBase = "https://arkckzzogbzvtflwdjoy.supabase.co/rest/v1";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFya2NrenpvZ2J6dnRmbHdkam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Mjk2OTcsImV4cCI6MjA4ODUwNTY5N30._iEF98cWd2PaHH4cYZ0iZWqarNvI_6s32jLCeqBKhKY";

const headers = {
  "apikey": key,
  "Authorization": `Bearer ${key}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

async function forceRestore() {
  try {
    const adminId = "da02dfb5-51a7-4a68-8b3c-e9b347365d95";
    const currentBalance = 0.000011;
    const newBalance = currentBalance + 0.001;
    
    // Add 0.001 to the balance
    await fetch(`${urlBase}/profiles?id=eq.${adminId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ balance: newBalance })
    });
    
    // Delete the failed transactions if any exist in pending 
    await fetch(`${urlBase}/transactions?user_id=eq.${adminId}&type=eq.withdrawal&status=eq.pending`, {
      method: "DELETE",
      headers
    });
    
    console.log(`Balance forced to ${newBalance} BNB for user ${adminId}. Pending withdrawals cleared.`);
    
  } catch (error) {
    console.error("Error restoring balance:", error);
  }
}

forceRestore();
