process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1';
import './config.js';
import { createRequire } from 'module';
import path, { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { platform } from 'process';
import fs, { readdirSync, statSync, unlinkSync, existsSync, watch } from 'fs';
import yargs from 'yargs';
import lodash from 'lodash';
const { chain } = lodash;
import chalk from 'chalk';
import pino from 'pino';
import { makeWASocket, protoType, serialize } from './lib/simple.js';
import { Low, JSONFile } from 'lowdb';
import NodeCache from 'node-cache';
import readline from 'readline';

// ==================== BAILEYS IMPORTS ====================
const baileys = await import('@whiskeysockets/baileys');
const { useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser } = baileys;
const makeInMemoryStore = baileys.makeInMemoryStore || baileys.default?.makeInMemoryStore;

const DisconnectReason = {
    connectionClosed: 428,
    connectionLost: 408,
    connectionReplaced: 440,
    timedOut: 408,
    loggedOut: 401,
    badSession: 500,
    restartRequired: 515,
    multideviceMismatch: 411,
    forbidden: 403,
    unavailableService: 503
};

protoType();
serialize();

// ==================== GLOBAL HELPERS ====================
global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
    return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString();
};

global.__dirname = function dirname(pathURL) {
    return path.dirname(global.__filename(pathURL, true));
};

global.__require = function require(dir = import.meta.url) {
    return createRequire(dir);
};

global.timestamp = { start: new Date };
const __dirname = global.__dirname(import.meta.url);

// ==================== OPTS & PREFIX ====================
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
global.prefix = new RegExp('^[' + (opts['prefix'] || '*/!#$%+£¢€¥^°=¶∆×÷π√✓©®&.\\-.@').replace(/[|\\{}()[\]^$+*.\-\^]/g, '\\$&') + ']');

// ==================== DATABASE CON WRITE THROTTLING ====================
global.db = new Low(new JSONFile('safeguard.json'));
global.DATABASE = global.db;

// OTTIMIZZAZIONE: Throttled write
let dbWritePending = false;
let dbWriteTimeout = null;

global.writeDB = async function() {
    if (dbWritePending) return;
    
    dbWritePending = true;
    clearTimeout(dbWriteTimeout);
    
    dbWriteTimeout = setTimeout(async () => {
        try {
            await global.db.write();
            dbWritePending = false;
        } catch (e) {
            console.error(chalk.red('DB write error:'), e.message);
            dbWritePending = false;
        }
    }, 5000); // Batch writes ogni 5s
};

global.loadDatabase = async function loadDatabase() {
    if (global.db.READ) {
        return new Promise((resolve) => {
            const interval = setInterval(async function () {
                if (!global.db.READ) {
                    clearInterval(interval);
                    resolve(global.db.data == null ? global.loadDatabase() : global.db.data);
                }
            }, 1000);
        });
    }
    if (global.db.data !== null) return;
    
    global.db.READ = true;
    await global.db.read().catch(console.error);
    global.db.READ = null;
    
    global.db.data = {
        users: {},
        chats: {},
        stats: {},
        settings: {},
        ...(global.db.data || {}),
    };
    global.db.chain = chain(global.db.data);
};

await loadDatabase();

// ==================== AUTH STATE ====================
global.authFile = 's';
const { state, saveCreds } = await useMultiFileAuthState(global.authFile);

// ==================== CACHE MASSIVAMENTE OTTIMIZZATE ====================
const msgRetryCounterCache = new NodeCache({ 
    stdTTL: 3600,
    checkperiod: 1800,
    useClones: false,
    maxKeys: 5000
});

global.jidCache = new NodeCache({ 
    stdTTL: 28800,  // 8h (era 6h)
    maxKeys: 20000,  // 20k (era 10k)
    useClones: false,
    checkperiod: 3600
});

global.nameCache = new NodeCache({ 
    stdTTL: 28800,
    maxKeys: 10000,
    useClones: false,
    checkperiod: 3600
});

const groupMetadataCache = new NodeCache({ 
    stdTTL: 14400,  // 4h (era 3h)
    checkperiod: 1800,
    maxKeys: 2000,  // 2000 gruppi
    useClones: false
});
global.groupCache = groupMetadataCache;
global.groupMetaCache = new Map();

// ==================== LOGGER SILENZIOSO ====================
const logger = pino({ level: 'silent' });

// ==================== STORE MINIMALE ====================
global.store = makeInMemoryStore ? makeInMemoryStore({ 
    logger,
    maxMessages: 50  // 50 (era 100) - risparmio RAM
}) : { 
    loadMessage: async () => undefined 
};

// ==================== MENU INTERATTIVO ====================
function showMenu() {
    console.clear();
    console.log(chalk.cyan.bold('\n╔══════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║   🛡️  SAFEGUARD BOT 🛡️         ║'));
    console.log(chalk.cyan.bold('╚══════════════════════════════════╝\n'));
    console.log(chalk.white('Seleziona modalità di avvio:\n'));
    console.log(chalk.green('  [1]') + chalk.white(' Avvio normale'));
    console.log(chalk.yellow('  [2]') + chalk.white(' Avvio + Notifica broadcast\n'));
    console.log(chalk.gray('Premi 1 o 2 e INVIO\n'));
}

async function getUserChoice() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        showMenu();

        rl.on('line', (input) => {
            const choice = input.trim();
            if (choice === '1' || choice === '2') {
                rl.close();
                resolve(choice);
            } else {
                console.log(chalk.red('❌ Scegli 1 o 2\n'));
            }
        });
    });
}

const userChoice = await getUserChoice();
console.clear();

if (userChoice === '1') {
    console.log(chalk.green('✅ Avvio normale\n'));
} else {
    console.log(chalk.yellow('✅ Avvio con broadcast\n'));
}

global.sendBroadcast = userChoice === '2';

// ==================== SESSION CLEANUP ====================
const SESSION_DIR = `./${global.authFile}`;
const MAX_AGE_MINUTES = 20;
const CLEAN_INTERVAL = 5 * 60 * 1000;

const PROTECTED_FILES = [
    'creds.json',
    'app-state-sync-version-critical.json',
    'app-state-sync-key-main.json',
    'app-state-sync-key-undefined.json'
];

const PROTECTED_PATTERNS = [
    /^creds\.json$/,
    /^app-state-sync-key/,
    /^app-state-sync-version/,
    /^pre-key/
];

function isProtected(filename) {
    if (PROTECTED_FILES.includes(filename)) return true;
    return PROTECTED_PATTERNS.some(pattern => pattern.test(filename));
}

function cleanOldSessions() {
    try {
        if (!existsSync(SESSION_DIR)) return;
        
        const now = Date.now();
        const maxAge = MAX_AGE_MINUTES * 60 * 1000;
        const files = readdirSync(SESSION_DIR);
        
        let deleted = 0;
        let totalSize = 0;
        
        for (const file of files) {
            if (isProtected(file)) continue;
            
            const filePath = join(SESSION_DIR, file);
            
            try {
                const stats = statSync(filePath);
                if (stats.isDirectory()) continue;
                
                const age = now - stats.mtimeMs;
                
                if (age > maxAge) {
                    unlinkSync(filePath);
                    totalSize += stats.size;
                    deleted++;
                }
            } catch {}
        }
        
        if (deleted > 0) {
            const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
            console.log(chalk.gray(`🧹 ${deleted} file | ${sizeMB} MB`));
        }
        
    } catch {}
}

console.log(chalk.cyan(`🧹 Pulizia sessioni attiva`));
cleanOldSessions();

let cleanupInterval = setInterval(() => {
    if (global.stopped === 'close' || !conn?.user) return;
    cleanOldSessions();
}, CLEAN_INTERVAL);

// ==================== CONNECTION OPTIONS ULTRA-OTTIMIZZATE ====================
const connectionOptions = {
    logger: logger,
    browser: Browsers.windows('Chrome'),
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    
    decodeJid: (jid) => {
        if (!jid) return jid;
        
        const cached = global.jidCache.get(jid);
        if (cached) return cached;
        
        let decoded = jid;
        
        if (/:\d+@/gi.test(jid)) {
            decoded = jidNormalizedUser(jid);
        }
        
        if (typeof decoded === 'object' && decoded.user && decoded.server) {
            decoded = `${decoded.user}@${decoded.server}`;
        }
        
        if (typeof decoded === 'string' && decoded.endsWith('@lid')) {
            decoded = decoded.replace('@lid', '@s.whatsapp.net');
        }
        
        global.jidCache.set(jid, decoded);
        return decoded;
    },
    
    printQRInTerminal: true,
    
    cachedGroupMetadata: async (jid) => {
        const cached = global.groupCache.get(jid);
        if (cached) return cached;
        
        try {
            const metadata = await global.conn.groupMetadata(global.conn.decodeJid(jid));
            if (metadata) {
                global.groupCache.set(jid, metadata);
            }
            return metadata;
        } catch {
            return {};
        }
    },
    
    getMessage: async (key) => {
        try {
            const jid = global.conn.decodeJid(key.remoteJid);
            const msg = await global.store.loadMessage(jid, key.id);
            return msg?.message || undefined;
        } catch {
            return undefined;
        }
    },
    
    msgRetryCounterCache,
    retryRequestDelayMs: 1500,  // 1.5s
    maxMsgRetryCount: 2,  // 2 (era 3)
    
    syncFullHistory: false,
    markOnlineOnConnect: false,  // FALSE per ridurre carico
    
    connectTimeoutMs: 90000,  // 90s (era 60s)
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,  // 30s (era 25s)
    
    emitOwnEvents: false,
    
    // OTTIMIZZAZIONE CRITICA: Transaction limits
    transactionOpts: {
        maxCommitRetries: 2,
        delayBetweenTriesMs: 3000
    },
    
    // OTTIMIZZAZIONE: Limita fetch automatici
    shouldSyncHistoryMessage: () => false,
    shouldIgnoreJid: (jid) => jid === 'status@broadcast'
};

global.conn = makeWASocket(connectionOptions);
global.store.bind(global.conn.ev);

conn.isInit = false;

// ==================== BROADCAST ULTRA-OTTIMIZZATO ====================
async function sendBroadcastMessage() {
    try {
        console.log(chalk.yellow('\n📡 Invio broadcast...'));
        
        const groups = Object.values(await conn.groupFetchAllParticipating());
        let success = 0;
        let failed = 0;
        
        const message = `🛡️ *SAFEGUARD BOT ONLINE* 🛡️\n\n✅ Bot operativo!\n\n_Pronto a proteggere_ 🔒`;
        
        // Batch ultra-piccoli per evitare ban
        const batchSize = 3;
        for (let i = 0; i < groups.length; i += batchSize) {
            const batch = groups.slice(i, i + batchSize);
            
            await Promise.allSettled(
                batch.map(async (group) => {
                    try {
                        await conn.sendMessage(group.id, { text: message });
                        success++;
                    } catch {
                        failed++;
                    }
                })
            );
            
            if (i + batchSize < groups.length) {
                await new Promise(resolve => setTimeout(resolve, 3000)); // 3s delay
            }
        }
        
        console.log(chalk.cyan(`\n📊 Broadcast: ${success} ✓ | ${failed} ✗\n`));
    } catch (e) {
        console.error(chalk.red('Errore broadcast:'), e.message);
    }
}

// ==================== DATABASE AUTO-SAVE CON THROTTLING ====================
if (!opts['test']) {
    setInterval(async () => {
        if (global.db?.data) {
            await global.writeDB();
        }
    }, 15 * 60 * 1000); // Ogni 15 min (era 10)
}

// ==================== CONNECTION UPDATE ====================
async function connectionUpdate(update) {
    const { connection, lastDisconnect, isNewLogin } = update;
    global.stopped = connection;
    
    if (isNewLogin) conn.isInit = true;
    
    const code = lastDisconnect?.error?.output?.statusCode || 
                 lastDisconnect?.error?.output?.payload?.statusCode;
    
    if (code && code !== DisconnectReason.loggedOut && connection === 'close') {
        console.log(chalk.yellow(`⚠️ Riconnessione...`));
        
        const delay = code === DisconnectReason.timedOut ? 5000 : 3000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        await global.reloadHandler(true).catch(console.error);
        return;
    }
    
    if (global.db.data == null) await loadDatabase();
    
    if (connection === 'open') {
        console.log(chalk.green('✅ Connesso'));
        
        if (global.sendBroadcast) {
            global.sendBroadcast = false;
            setTimeout(() => sendBroadcastMessage(), 5000);
        }
    }
    
    if (connection === 'close') {
        if (code === DisconnectReason.loggedOut) {
            console.log(chalk.red('🚪 Logout'));
            if (fs.existsSync(global.authFile)) {
                fs.rmSync(global.authFile, { recursive: true, force: true });
            }
            process.exit(1);
        }
    }
}

// ==================== ERROR HANDLERS ====================
process.on('uncaughtException', (err) => {
    console.error(chalk.red('Uncaught:'), err.message);
});

process.on('unhandledRejection', (err) => {
    console.error(chalk.red('Unhandled:'), err.message);
});

// ==================== EVENT LISTENERS ====================
conn.ev.on('connection.update', connectionUpdate);
conn.ev.on('creds.update', saveCreds);

// ==================== LOAD HANDLER ====================
let isInit = true;
let handler = await import('./handler.js');

// ==================== GROUP EVENTS ====================
conn.ev.on('group-participants.update', async (update) => {
    try {
        if (handler?.participantsUpdate) {
            await handler.participantsUpdate.call(conn, update);
        }
    } catch (e) {
        console.error(chalk.red('❌ participants.update:'), e.message);
    }
});

conn.ev.on('groups.update', async (update) => {
    try {
        if (handler?.groupsUpdate) {
            await handler.groupsUpdate.call(conn, update);
        }
    } catch (e) {
        console.error(chalk.red('❌ groups.update:'), e.message);
    }
});

// ==================== RELOAD HANDLER ====================
global.reloadHandler = async function (restatConn) {
    try {
        const Handler = await import(`./handler.js?update=${Date.now()}`);
        if (Object.keys(Handler || {}).length) handler = Handler;
    } catch (e) {
        console.error(chalk.red('Handler reload error:'), e.message);
    }
    
    if (restatConn) {
        try {
            global.conn.ws.close();
        } catch {}
        
        conn.ev.removeAllListeners();
        
        // Reset cache
        global.jidCache.flushAll();
        global.groupCache.flushAll();
        global.groupMetaCache.clear();
        
        global.conn = makeWASocket(connectionOptions);
        global.store.bind(global.conn.ev);
        isInit = true;
    }
    
    if (!isInit) {
        conn.ev.off('messages.upsert', conn.handler);
        conn.ev.off('group-participants.update', conn.participantsUpdate);
        conn.ev.off('groups.update', conn.groupsUpdate);
        conn.ev.off('connection.update', conn.connectionUpdate);
        conn.ev.off('creds.update', conn.credsUpdate);
    }
    
    conn.handler = handler.handler.bind(global.conn);
    conn.participantsUpdate = handler.participantsUpdate.bind(global.conn);
    conn.groupsUpdate = handler.groupsUpdate.bind(global.conn);
    conn.connectionUpdate = connectionUpdate.bind(global.conn);
    conn.credsUpdate = saveCreds;
    
    conn.ev.on('messages.upsert', conn.handler);
    conn.ev.on('group-participants.update', conn.participantsUpdate);
    conn.ev.on('groups.update', conn.groupsUpdate);
    conn.ev.on('connection.update', conn.connectionUpdate);
    conn.ev.on('creds.update', conn.credsUpdate);
    
    isInit = false;
    return true;
};

// ==================== PLUGINS LOADER ====================
const pluginFolder = global.__dirname(join(__dirname, './plugins/index'));
const pluginFilter = (filename) => /\.js$/.test(filename);
global.plugins = {};

async function filesInit() {
    const files = readdirSync(pluginFolder).filter(pluginFilter);
    
    await Promise.allSettled(
        files.map(async (filename) => {
            try {
                const file = global.__filename(join(pluginFolder, filename));
                const module = await import(file);
                global.plugins[filename] = module.default || module;
            } catch (e) {
                console.error(chalk.red(`Plugin ${filename}:`), e.message);
                delete global.plugins[filename];
            }
        })
    );
    
    console.log(chalk.cyan(`📦 ${Object.keys(global.plugins).length} plugins`));
}

await filesInit();

// ==================== PLUGIN RELOAD ====================
global.reload = async (_ev, filename) => {
    if (pluginFilter(filename)) {
        const dir = global.__filename(join(pluginFolder, filename), true);
        
        if (filename in global.plugins) {
            if (existsSync(dir)) {
                conn.logger.info(chalk.green(`✅ '${filename}'`));
            } else {
                conn.logger.warn(`🗑️ '${filename}'`);
                return delete global.plugins[filename];
            }
        } else {
            conn.logger.info(`🆕 '${filename}'`);
        }
        
        try {
            const module = await import(`${global.__filename(dir)}?update=${Date.now()}`);
            global.plugins[filename] = module.default || module;
        } catch (e) {
            conn.logger.error(`❌ ${filename}: ${e.message}`);
        } finally {
            global.plugins = Object.fromEntries(
                Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b))
            );
        }
    }
};

Object.freeze(global.reload);

const pluginWatcher = watch(pluginFolder, global.reload);
const mainWatcher = watch(fileURLToPath(import.meta.url), async () => {
    console.log(chalk.magenta("⚡ Main riavviato"));
});

await global.reloadHandler();

// ==================== STATS PERIODICI ====================
if (!opts['nostats']) {
    setInterval(() => {
        if (!conn?.user) return;
        
        const mem = process.memoryUsage();
        console.log(chalk.gray(
            `📊 ${(mem.heapUsed / 1024 / 1024).toFixed(0)}MB | ` +
            `${global.jidCache.getStats().keys} JID | ${global.groupCache.getStats().keys} Groups`
        ));
    }, 30 * 60 * 1000); // Ogni 30 min (era 15)
}

console.log(chalk.green('\n✅ Bot pronto!\n'));
