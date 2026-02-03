let handler = async function (m, { conn, text, usedPrefix }) {
    let chat = global.db.data.chats[m.chat];
    
    if (!chat.rules || chat.rules === '') {
        return await conn.reply(m.chat, `ㅤㅤ⋆｡˚『 ⚠️ ╭ \`REGOLE NON IMPOSTATE\` ╯ 』˚｡⋆\n\n『 📜 』Gli admin non hanno ancora settato le regole\n\n> Usa ${usedPrefix}setregole per impostarle`.trim(), m);
    }

    await conn.reply(m.chat, `ㅤㅤ⋆｡˚『 📜 ╭ \`REGOLE DEL GRUPPO\` ╯ 』˚｡⋆\n\n${chat.rules}\n\n> Rispetta le regole per evitare sanzioni`.trim(), m);
};

handler.help = ['rules'];
handler.tags = ['group'];
handler.command = ['rules', 'regole'];
handler.group = true;

export default handler;
