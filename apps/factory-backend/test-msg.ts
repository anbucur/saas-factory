import { db } from './src/db/index.js';
import { projects, messages } from './src/db/schema.js';
import { eq, like } from 'drizzle-orm';

const projs = db.select().from(projects).all();
console.log('Projects:', projs.map(p => p.name));
for (const proj of projs) {
  if (proj.name.toLowerCase().includes('paint') || proj.name.toLowerCase().includes('aline')) {
    const msgs = db.select().from(messages).where(eq(messages.projectId, proj.id)).all();
    console.log(`\n=== PROJECT: ${proj.name} ===`);
    const devMsgs = msgs.filter(m => m.agentRole === 'frontend_dev' || m.agentRole === 'backend_dev');
    if (devMsgs.length === 0) console.log('No dev messages found');
    else console.log(devMsgs.map(m=> `${m.agentRole}:\n${m.content.slice(0,200)}...`).join('\n---\n'));
  }
}
