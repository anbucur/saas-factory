import { loadEnvFile } from 'node:process';
try {
  loadEnvFile();
  console.log('API Key:', process.env.MINIMAX_API_KEY ? 'Present' : 'Missing');
} catch (e) {
  console.error(e.message);
}
