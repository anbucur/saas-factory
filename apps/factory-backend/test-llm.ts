import { loadEnvFile } from 'node:process';
try { loadEnvFile() } catch {}

(async () => {
  const apiKey = process.env.MINIMAX_API_KEY;
  console.log('Testing with key starting with:', apiKey.substring(0, 10));
  
  const response = await fetch('https://api.minimax.io/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'MiniMax-M2.7',
      messages: [{role: 'user', content: 'test'}]
    })
  });
  const data = await response.json();
  console.log('Result:', JSON.stringify(data, null, 2));
})();
