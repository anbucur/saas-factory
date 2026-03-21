import { db } from './src/db/index.js';
import { messages } from './src/db/schema.js';
import { eq, desc } from 'drizzle-orm';
const msgs = db.select().from(messages).where(eq(messages.agentRole, 'frontend_dev')).orderBy(desc(messages.createdAt)).all();
if(msgs.length > 0) {
  for(const msg of msgs) {
    if (msg.content.includes('Fallback Mode')) {
      console.log(msg.content.substring(0, 1000));
      console.log('------- \n', msg.content.substring(msg.content.length - 1000));
      break; 
    }
  }
} else {
  console.log('No messages found');
}
