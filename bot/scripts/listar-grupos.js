/**
 * scripts/listar-grupos.js
 *
 * Script auxiliar para descobrir o ID dos grupos do WhatsApp.
 *
 * USO:
 *   cd bot
 *   npm run listar-grupos
 *
 * O script conecta ao WhatsApp (exibe QR se necessário), lista todos os grupos
 * com seus IDs e depois encerra. Copie o ID desejado para WHATSAPP_GROUP_ID no .env.
 */

import { conectar, listarGrupos } from '../lib/whatsapp.js';

console.log('Conectando ao WhatsApp para listar grupos...');
console.log('(Se for o primeiro acesso, um QR code será exibido abaixo)\n');

const sock = await conectar();

// Aguarda um momento para o store sincronizar os chats
await new Promise((r) => setTimeout(r, 3000));

const grupos = await listarGrupos();

if (grupos.length === 0) {
  console.log('Nenhum grupo encontrado. Certifique-se de que o número participa de algum grupo.');
} else {
  console.log(`\n📋 ${grupos.length} grupo(s) encontrado(s):\n`);
  console.log('─'.repeat(60));

  grupos
    .sort((a, b) => b.participantes - a.participantes)
    .forEach((g) => {
      console.log(`Nome:         ${g.nome}`);
      console.log(`ID:           ${g.id}`);
      console.log(`Participantes: ${g.participantes}`);
      console.log('─'.repeat(60));
    });

  console.log('\n👉 Copie o ID do grupo desejado e adicione ao .env como:');
  console.log('   WHATSAPP_GROUP_ID=<ID acima>\n');
}

process.exit(0);
