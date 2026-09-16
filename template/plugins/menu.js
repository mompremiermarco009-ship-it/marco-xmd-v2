// template/plugins/menu.js
const os = require('os');
const { getUptimes } = require('../utils/uptime');

function getMenuState(sock) {
    if (!sock._menuState) sock._menuState = new Map();
    return sock._menuState;
}

// ─── Date au format jj/mm/aa ───
function getDate() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
}

// ─── Bloc information commun (en-tête des menus) ───
function buildInfo(sock) {
    const cfg = sock.config || {};
    const { session: sessionUp } = getUptimes(sock);
    const botName = cfg.botName || 'MARCO-XMD';
    const ownerName = cfg.ownerName || 'Mr_Marco';
    const prefix = cfg.prefix || '.';
    const emoji = cfg.emoji || '🍷';
    const platform = os.platform();

    return `╭━━━〔 👤 𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧𝐬 〕━━━╮
┃  ${emoji}  𝐁𝐨𝐭     : ${botName}
┃  👑  𝐎𝐰𝐧𝐞𝐫   : ${ownerName}
┃  📦  𝐏𝐫𝐞𝐟𝐢𝐱  : ${prefix}
┃  💻 *𝐏𝐥𝐚𝐭𝐞𝐟𝐨𝐫𝐦𝐞* : ${platform}
┃    𝐃𝐚𝐭𝐞 : ${getDate()}
┃  ⏱️  𝐔𝐩𝐭𝐢𝐦𝐞  : ${sessionUp}
╰━━━━━━━━━━━━━━━━━━╯`;
}

// ─── Pied de page commun ───
function buildFooter(ownerName, backToMain = false) {
    let txt = '';
    if (backToMain) {
        txt += `⬅️ _𝑇𝑎𝑝𝑒𝑧 0 𝑝𝑜𝑢𝑟 𝑙𝑒 𝑚𝑒𝑛𝑢 𝑃𝑟𝑖𝑛𝑐𝑖𝑝𝑎𝑙𝑒_\n`;
    }
    txt += `🔡 _𝑅𝑒𝑝𝑜𝑛𝑑𝑒𝑧 𝑎𝑣𝑒𝑐 𝑙𝑎 𝑙𝑒𝑡𝑡𝑟𝑒_\n_𝑑𝑒 𝑣𝑜𝑡𝑟𝑒 𝑐ℎ𝑜𝑖𝑥_\n\n> 𝑃𝑜𝑤𝑒𝑟𝑒𝑑 𝑏𝑦 ${ownerName}`;
    return txt;
}

// ═══════════════════════════════════════════════════════════
//  MENU PRINCIPAL
// ═══════════════════════════════════════════════════════════
function buildMainMenu(sock) {
    const cfg = sock.config || {};
    const emoji = cfg.emoji || '🍷';
    const ownerName = cfg.ownerName || 'Mr_Marco';

    return `╭━━━━━━━━━━━━━━━━━━╮
┃ ${emoji}𝐌𝐀𝐑𝐂𝐎-𝐗𝐌𝐃  𝐌𝐄𝐍𝐔${emoji}
╰━━━━━━━━━━━━━━━━━━╯

${buildInfo(sock)}

╭━━━〔 📋 𝐂𝐚𝐭𝐞𝐠𝐨𝐫𝐢𝐞𝐬 〕━━━╮
┃  Ⓐ︎  📥 Downloader Menu
┃  Ⓑ︎  🔧  Utils Menu    
┃  Ⓒ︎  👥  Groupes Menu
┃  Ⓓ︎  👑  Owner Menu
╰━━━━━━━━━━━━━━━━━━╯

${buildFooter(ownerName)}`;
}

// ═══════════════════════════════════════════════════════════
//  MENU A — DOWNLOADER
// ═══════════════════════════════════════════════════════════
function buildDownloaderMenu(sock) {
    const cfg = sock.config || {};
    const ownerName = cfg.ownerName || 'Mr_Marco';

    return `╭━━━━━━━━━━━━━━━━━━╮
┃ 📥  𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑  𝐌𝐄𝐍𝐔  📥
╰━━━━━━━━━━━━━━━━━━╯

${buildInfo(sock)}

╭━━━〔 🎬 𝐕𝐢𝐝𝐞𝐨𝐬 〕━━━╮
┃  Ⓐ︎  ▶️  .play       
┃  Ⓑ︎  🎵  .song       
┃  Ⓒ︎  📥  .ytdl       
┃  Ⓓ︎  📱  .tiktok     
┃  Ⓔ︎  📸  .instagram  
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🔗 𝐎𝐮𝐭𝐢𝐥𝐬 𝐖𝐞𝐛 〕━━━╮
┃  Ⓕ︎  🌐  Video Downloader
┃  Ⓖ︎  🎵  Marco Lyrics    
┃  Ⓗ︎  🎙️  Voice Studio    
╰━━━━━━━━━━━━━━━━━━╯

${buildFooter(ownerName, true)}`;
}

// ═══════════════════════════════════════════════════════════
//  MENU B — UTILS
// ═══════════════════════════════════════════════════════════
function buildUtilsMenu(sock) {
    const cfg = sock.config || {};
    const ownerName = cfg.ownerName || 'Mr_Marco';

    return `╭━━━━━━━━━━━━━━━━━━╮
┃  🔧  𝐔𝐓𝐈𝐋𝐒  𝐌𝐄𝐍𝐔   🔧
╰━━━━━━━━━━━━━━━━━━╯

${buildInfo(sock)}

╭━━━〔 🧩 𝐎𝐮𝐭𝐢𝐥𝐬 〕━━━╮
┃  Ⓐ︎  🔍  .qr         
┃  Ⓑ︎  🎫  .jid        
┃  Ⓒ︎  🔢  .calc       
┃  Ⓓ︎  📊  .barcode    
┃  Ⓔ︎  🆔  .uuid       
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 📝 𝐓𝐞𝐱𝐭𝐞 〕━━━╮
┃  Ⓕ︎  🔐  .base64     
┃  Ⓖ︎  🎨  .color      
┃  Ⓗ︎  📖  .lorem      
┃  Ⓘ︎  🌍  .translate  
┃  Ⓙ︎  ⏱️  .timer      
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 ℹ️ 𝐈𝐧𝐟𝐨 〕━━━╮
┃  Ⓚ︎  🏓  .ping       
┃  Ⓛ︎  📊  .stats      
┃  Ⓜ︎  ℹ️  .info       
┃  Ⓝ︎  🌐  .repo       
╰━━━━━━━━━━━━━━━━━━╯

${buildFooter(ownerName, true)}`;
}

// ═══════════════════════════════════════════════════════════
//  MENU C — GROUPES
// ═══════════════════════════════════════════════════════════
function buildGroupesMenu(sock) {
    const cfg = sock.config || {};
    const ownerName = cfg.ownerName || 'Mr_Marco';

    return `╭━━━━━━━━━━━━━━━━━━╮
┃  👥  𝐆𝐑𝐎𝐔𝐏𝐄𝐒  𝐌𝐄𝐍𝐔  👥
╰━━━━━━━━━━━━━━━━━━╯

${buildInfo(sock)}

╭━━━〔 🛠️ 𝐌𝐨𝐝𝐞𝐫𝐚𝐭𝐢𝐨𝐧 〕━━━╮
┃  Ⓐ︎  ➕  .add        
┃  Ⓑ︎  👢  .kick       
┃  Ⓒ︎  🧹  .kickall    
┃  Ⓓ︎  ⬆️  .promote    
┃  Ⓔ︎  ⬇️  .demote     
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 📢 𝐀𝐧𝐧𝐨𝐧𝐜𝐞𝐬 〕━━━╮
┃  Ⓕ︎  📢  .tagall     
┃  Ⓖ︎  📣  .hidetag    
┃  Ⓗ︎  🌐  .groups     
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🔧 𝐂𝐨𝐧𝐭𝐫𝐨̂𝐥𝐞 〕━━━╮
┃  Ⓘ︎  🔓  .open       
┃  Ⓙ︎  🔒  .close      
┃  Ⓚ︎  🚪  .leaveall   
╰━━━━━━━━━━━━━━━━━━╯

${buildFooter(ownerName, true)}`;
}

// ═══════════════════════════════════════════════════════════
//  MENU D — OWNER
// ═══════════════════════════════════════════════════════════
function buildOwnerMenu(sock) {
    const cfg = sock.config || {};
    const ownerName = cfg.ownerName || 'Mr_Marco';

    return `╭━━━━━━━━━━━━━━━━━━╮
┃   👑  𝐎𝐖𝐍𝐄𝐑  𝐌𝐄𝐍𝐔   👑
╰━━━━━━━━━━━━━━━━━━╯

${buildInfo(sock)}

╭━━━〔 ⚙️ 𝐂𝐨𝐧𝐟𝐢𝐠 〕━━━╮
┃  Ⓐ︎  🔓  .public     
┃  Ⓑ︎  🔐  .self       
┃  Ⓒ︎  ⚙️  .setprefix  
┃  Ⓓ︎  👀  .reactstatus
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🤖 𝐁𝐨𝐭𝐬 〕━━━╮
┃  Ⓔ︎  🔑  .pair       
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🛡️ 𝐒𝐞́𝐜𝐮𝐫𝐢𝐭𝐞́ 〕━━━╮
┃  Ⓕ︎  🚫  .block      
┃  Ⓖ︎  ✅  .unblock    
╰━━━━━━━━━━━━━━━━━━╯

${buildFooter(ownerName, true)}`;
}

// ═══════════════════════════════════════════════════════════
//  LOGOS + ACTIONS
// ═══════════════════════════════════════════════════════════
function getLogo(cfg, menuId) {
    const map = {
        'main':       cfg.logo,
        'downloader': cfg.logoDownloader,
        'utils':      cfg.logoUtils,
        'groupes':    cfg.logoGroup,
        'owner':      cfg.logoOwner
    };
    return map[menuId] || cfg.logo || cfg.botLogo;
}

const MENU_ACTIONS = {
    'main': {
        'A': { action: 'menu', target: 'downloader' },
        'B': { action: 'menu', target: 'utils' },
        'C': { action: 'menu', target: 'groupes' },
        'D': { action: 'menu', target: 'owner' }
    },
    'downloader': {
        'A': { action: 'cmd', value: 'play' },
        'B': { action: 'cmd', value: 'song' },
        'C': { action: 'cmd', value: 'ytdl' },
        'D': { action: 'cmd', value: 'tiktok' },
        'E': { action: 'cmd', value: 'instagram' },
        'F': { action: 'web', value: '/video_downloader/' },
        'G': { action: 'web', value: '/marco_lyrics/' },
        'H': { action: 'web', value: '/voice_studio/' }
    },
    'utils': {
        'A': { action: 'cmd', value: 'qr' },
        'B': { action: 'cmd', value: 'jid' },
        'C': { action: 'cmd', value: 'calc' },
        'D': { action: 'cmd', value: 'barcode' },
        'E': { action: 'cmd', value: 'uuid' },
        'F': { action: 'cmd', value: 'base64' },
        'G': { action: 'cmd', value: 'color' },
        'H': { action: 'cmd', value: 'lorem' },
        'I': { action: 'cmd', value: 'translate' },
        'J': { action: 'cmd', value: 'timer' },
        'K': { action: 'cmd', value: 'ping' },
        'L': { action: 'cmd', value: 'stats' },
        'M': { action: 'cmd', value: 'info' },
        'N': { action: 'cmd', value: 'repo' }
    },
    'groupes': {
        'A': { action: 'cmd', value: 'add' },
        'B': { action: 'cmd', value: 'kick' },
        'C': { action: 'cmd', value: 'kickall' },
        'D': { action: 'cmd', value: 'promote' },
        'E': { action: 'cmd', value: 'demote' },
        'F': { action: 'cmd', value: 'tagall' },
        'G': { action: 'cmd', value: 'hidetag' },
        'H': { action: 'cmd', value: 'groups' },
        'I': { action: 'cmd', value: 'open' },
        'J': { action: 'cmd', value: 'close' },
        'K': { action: 'cmd', value: 'leaveall' }
    },
    'owner': {
        'A': { action: 'cmd', value: 'public' },
        'B': { action: 'cmd', value: 'self' },
        'C': { action: 'cmd', value: 'setprefix' },
        'D': { action: 'cmd', value: 'reactstatus' },
        'E': { action: 'cmd', value: 'pair' },
        'F': { action: 'cmd', value: 'block' },
        'G': { action: 'cmd', value: 'unblock' }
    }
};

const MENU_BUILDERS = {
    'main': buildMainMenu,
    'downloader': buildDownloaderMenu,
    'utils': buildUtilsMenu,
    'groupes': buildGroupesMenu,
    'owner': buildOwnerMenu
};

// ─── Envoi d'un menu avec son propre logo ───
async function sendMenu(sock, jid, menuId, quotedMsg = null) {
    const cfg = sock.config || {};
    const builder = MENU_BUILDERS[menuId] || MENU_BUILDERS['main'];
    const text = builder(sock);
    const logo = getLogo(cfg, menuId);

    console.log(`📤 Menu "${menuId}" | logo: ${logo ? 'OUI' : 'NON'}`);

    try {
        if (logo) {
            await sock.sendMessage(jid, {
                image: { url: logo },
                caption: text
            }, quotedMsg ? { quoted: quotedMsg } : {});
        } else {
            await sock.sendMessage(jid, { text }, quotedMsg ? { quoted: quotedMsg } : {});
        }
    } catch (err) {
        console.error('❌ Erreur image menu:', err.message);
        await sock.sendMessage(jid, { text }, quotedMsg ? { quoted: quotedMsg } : {});
    }
}

// ─── Listener global ───
function attachMenuListener(sock) {
    if (sock._menuListenerAttached) return;
    sock._menuListenerAttached = true;
    console.log('🎧 Menu listener attaché');

    sock.ev.on('messages.upsert', async (event) => {
        const messages = event.messages || [];
        if (!messages.length) return;

        for (const m of messages) {
            if (!m || !m.message) continue;
            if (m.key.fromMe) continue;

            const mJid = m.key.remoteJid;
            const states = getMenuState(sock);
            const state = states.get(mJid);
            if (!state) continue;

            // Expiration 5 min
            if (Date.now() - state.timestamp > 5 * 60 * 1000) {
                states.delete(mJid);
                continue;
            }

            const text = (
                m.message.conversation ||
                m.message.extendedTextMessage?.text ||
                ''
            ).trim();

            if (!text) continue;

            console.log(`📨 [menu] "${text}" dans ${state.menuId}`);

            // Retour menu principal
            if (text === '0') {
                states.set(mJid, { menuId: 'main', timestamp: Date.now() });
                await sendMenu(sock, mJid, 'main', m);
                continue;
            }

            // Lettre A-Z
            const letterMatch = text.toUpperCase().match(/^([A-Z])$/);
            if (!letterMatch) continue;
            const letter = letterMatch[1];

            const actions = MENU_ACTIONS[state.menuId];
            if (!actions) continue;

            const action = actions[letter];
            if (!action) continue;

            // Ouvrir sous-menu
            if (action.action === 'menu') {
                states.set(mJid, { menuId: action.target, timestamp: Date.now() });
                await sendMenu(sock, mJid, action.target, m);
                continue;
            }

            // Exécuter commande
            if (action.action === 'cmd') {
                const targetCmd = action.value;
                const plugin = sock.commands.get(targetCmd);

                if (!plugin) {
                    await sock.sendMessage(mJid, {
                        text: `❌ Commande *${targetCmd}* non disponible.`
                    }, { quoted: m });
                    continue;
                }

                states.delete(mJid);
                try {
                    await plugin.execute(sock, m, [], targetCmd);
                } catch (err) {
                    console.error(`❌ Erreur ${targetCmd}:`, err.message);
                }
                continue;
            }

            // Lien web
            if (action.action === 'web') {
                const cfg = sock.config || {};
                const port = process.env.PORT || 10000;
                const baseUrl = cfg.publicUrl || `http://localhost:${port}`;
                const url = `${baseUrl}${action.value}`;

                states.delete(mJid);
                await sock.sendMessage(mJid, {
                    text: `🌐 *Lien direct :*\n${url}`
                }, { quoted: m });
                continue;
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════
//  PLUGIN
// ═══════════════════════════════════════════════════════════
module.exports = {
    name: 'menu',
    aliases: ['help', 'h', 'aide'],
    category: 'general',
    desc: 'Affiche le menu principal avec navigation par lettre',
    usage: '.menu',

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        attachMenuListener(sock);

        const states = getMenuState(sock);
        states.set(jid, { menuId: 'main', timestamp: Date.now() });

        await sendMenu(sock, jid, 'main', msg);
    }
};
