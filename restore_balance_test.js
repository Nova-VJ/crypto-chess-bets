const urlBase = "https://arkckzzogbzvtflwdjoy.supabase.co/rest/v1";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFya2NrenpvZ2J6dnRmbHdkam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Mjk2OTcsImV4cCI6MjA4ODUwNTY5N30._iEF98cWd2PaHH4cYZ0iZWqarNvI_6s32jLCeqBKhKY";

const headers = {
  "apikey": key,
  "Authorization": `Bearer ${key}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

async function check() {
  const adminId = "da02dfb5-51a7-4a68-8b3c-e9b347365d95";
  
  // 1. Force update
  const res = await fetch(`${urlBase}/profiles?id=eq.${adminId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ balance: 0.001011 })
  });
  
  console.log("Update status:", res.status);
  console.log("Update response:", await res.json());

  // 2. Fetch it back
  const getRes = await fetch(`${urlBase}/profiles?id=eq.${adminId}&select=balance`, { headers });
  console.log("Current balance:", await getRes.json());
}

check();
