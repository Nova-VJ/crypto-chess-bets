const url = "https://arkckzzogbzvtflwdjoy.supabase.co/rest/v1/games?is_smart_contract=eq.true&status=eq.cancelled&select=id,contract_game_id,stake_amount";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFya2NrenpvZ2J6dnRmbHdkam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Mjk2OTcsImV4cCI6MjA4ODUwNTY5N30._iEF98cWd2PaHH4cYZ0iZWqarNvI_6s32jLCeqBKhKY";

fetch(url, {
  headers: {
    "apikey": key,
    "Authorization": `Bearer ${key}`
  }
})
.then(res => res.json())
.then(data => {
  console.log("Stuck Games:");
  data.forEach(g => {
    console.log(`DB ID: ${g.id}`);
    console.log(`Contract Game ID: ${g.contract_game_id}`);
    console.log(`Stake: ${g.stake_amount}`);
    console.log("---");
  });
})
.catch(console.error);
