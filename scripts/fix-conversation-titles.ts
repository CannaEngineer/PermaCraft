/**
 * Fix Conversation Titles
 *
 * Updates conversations that have NULL or empty titles to use their first
 * message as the title (truncated to 50 characters).
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fixConversationTitles() {
  const { db } = await import('../lib/db/index.js');

  console.log('🔧 Fixing conversation titles...\n');

  // Find all conversations with NULL or empty titles
  const conversationsResult = await db.execute({
    sql: `
      SELECT id
      FROM ai_conversations
      WHERE title IS NULL OR title = ''
    `,
    args: [],
  });

  console.log(`Found ${conversationsResult.rows.length} conversations with missing titles\n`);

  let fixed = 0;
  let noMessages = 0;

  for (const conv of conversationsResult.rows) {
    const conversationId = conv.id as string;

    // Get first message for this conversation
    const messagesResult = await db.execute({
      sql: `
        SELECT user_query
        FROM ai_analyses
        WHERE conversation_id = ?
        ORDER BY created_at ASC
        LIMIT 1
      `,
      args: [conversationId],
    });

    const firstMessage = messagesResult.rows[0] as any;

    if (firstMessage && firstMessage.user_query) {
      const query = firstMessage.user_query as string;
      const title = query.length > 50
        ? query.substring(0, 47) + "..."
        : query;

      await db.execute({
        sql: 'UPDATE ai_conversations SET title = ? WHERE id = ?',
        args: [title, conversationId],
      });

      console.log(`✅ Fixed: "${title}"`);
      fixed++;
    } else {
      // No messages in conversation, use "Untitled Conversation"
      await db.execute({
        sql: 'UPDATE ai_conversations SET title = ? WHERE id = ?',
        args: ['Untitled Conversation', conversationId],
      });
      console.log(`⚠️  No messages found, set to "Untitled Conversation"`);
      noMessages++;
    }
  }

  console.log(`\n✅ Complete:`);
  console.log(`  Fixed with message titles: ${fixed}`);
  console.log(`  Set to "Untitled": ${noMessages}`);
  console.log(`  Total: ${fixed + noMessages}`);
}

fixConversationTitles().catch(console.error);
