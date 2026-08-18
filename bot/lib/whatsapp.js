/**
 * lib/whatsapp.js
 *
 * Gerencia a conexão com WhatsApp via Baileys.
 *
 * - Primeira execução: exibe QR code no terminal para parear o número.
 * - Sessão salva em auth_info/ — nas execuções seguintes reconecta automaticamente.
 * - Reconexão automática em caso de queda de rede ou erro transitório.
 * - Se o número for deslogado (banido ou logout manual), encerra o processo.
 */

import { createRequire } from 'module';
import { EventEmitter } from 'events';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

// Baileys é CJS — importa via createRequire para compatibilidade com ESM
const require = createRequire(import.meta.url);
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

const emitter = new EventEmitter();
let sock = null;

const logger = pino({ level: 'silent' });

async function criarSocket(state, version) {
  return makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['MKCompras Bot', 'Chrome', '1.0'],
    // Reduz chance de detecção de bot
    markOnlineOnConnect: false,
  });
}

/**
 * Conecta ao WhatsApp. Resolve quando a sessão estiver aberta.
 * Reconecta automaticamente em caso de queda.
 *
 * @returns {Promise<object>} - Socket do Baileys já conectado
 */
export async function conectar() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  sock = await criarSocket(state, version);
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 Escaneie o QR code abaixo com seu WhatsApp Business:\n');
      qrcode.generate(qr, { small: true });
      console.log('\nAguardando leitura do QR...\n');
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const deveReconectar = statusCode !== DisconnectReason.loggedOut;

      console.log(`[WA] Conexão encerrada — código ${statusCode}.`);

      if (deveReconectar) {
        console.log('[WA] Reconectando em 5 segundos...');
        setTimeout(conectar, 5000);
      } else {
        console.error('[WA] Número deslogado. Delete a pasta auth_info/ e reinicie o bot.');
        process.exit(1);
      }
    }

    if (connection === 'open') {
      console.log('[WA] ✅ Conectado ao WhatsApp!');
      emitter.emit('connected');
    }
  });

  return new Promise((resolve) => {
    emitter.once('connected', () => resolve(sock));
  });
}

/**
 * Envia uma mensagem de texto para um grupo.
 *
 * @param {string} grupoId  - JID do grupo (ex: "1203630xxxxx@g.us")
 * @param {string} mensagem - Texto da mensagem (suporta formatação WhatsApp)
 */
export async function postarNoGrupo(grupoId, mensagem) {
  if (!sock) throw new Error('[WA] Socket não inicializado — chame conectar() primeiro.');
  await sock.sendMessage(grupoId, { text: mensagem });
}

/**
 * Lista todos os grupos dos quais o número participa.
 *
 * @returns {Promise<Array<{ id: string, nome: string, participantes: number }>>}
 */
export async function listarGrupos() {
  if (!sock) throw new Error('[WA] Socket não inicializado — chame conectar() primeiro.');
  const chats = await sock.groupFetchAllParticipating();
  return Object.values(chats).map((g) => ({
    id: g.id,
    nome: g.subject,
    participantes: g.participants?.length ?? 0,
  }));
}
