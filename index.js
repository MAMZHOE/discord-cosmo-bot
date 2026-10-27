require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType } = require("discord.js");
const OpenAI = require("openai");

const BOT_PREFIX = (process.env.BOT_PREFIX || "hey cosmo").trim().toLowerCase();
const allowedUserIds = (process.env.ALLOWED_USER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function isAllowedUser(userId) {
  return allowedUserIds.includes(userId);
}

function parseSendCommand(rawText) {
  const match = rawText.match(
    /^send\s+(?:["'](.+?)["']|(.+?))\s+in\s+(?:<#(\d+)>|#([a-z0-9-]+))/i
  );

  if (!match) return null;

  const messageText = (match[1] || match[2] || "").trim();
  const channelId = match[3] || null;
  const channelName = match[4] ? match[4].trim().toLowerCase() : null;

  if (!messageText) return null;

  return { messageText, channelId, channelName };
}

async function findChannelByName(guild, channelName) {
  if (!guild || !channelName) return null;

  const channel = guild.channels.cache.find(
    (ch) => ch.type === ChannelType.GuildText && ch.name.toLowerCase() === channelName.toLowerCase()
  );

  if (channel) return channel;

  const fetchedGuild = await guild.channels.fetch();
  return fetchedGuild.find(
    (ch) => ch && ch.type === ChannelType.GuildText && ch.name.toLowerCase() === channelName.toLowerCase()
  );
}

async function sendAnonymousMessage(message, rawText) {
  const parsed = parseSendCommand(rawText);

  if (!parsed) {
    await message.reply(
      "Usage: `hey cosmo, send 'hello' in #general`"
    );
    return;
  }

  let targetChannel = null;

  if (parsed.channelId) {
    targetChannel = message.guild.channels.cache.get(parsed.channelId);
    if (!targetChannel) {
      targetChannel = await message.guild.channels.fetch(parsed.channelId).catch(() => null);
    }
  }

  if (!targetChannel && parsed.channelName) {
    targetChannel = await findChannelByName(message.guild, parsed.channelName);
  }

  if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
    await message.reply(`I couldn't find that channel. Try using a valid text channel like #general.`);
    return;
  }

  await targetChannel.send(parsed.messageText);
  await message.reply({
    content: `Sent anonymously to ${targetChannel}.`,
    allowedMentions: { repliedUser: false },
  });
}

async function getCosmoReply(prompt) {
  if (!openai) {
    return "Cosmo is online, but the OpenAI API key is not configured yet.";
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Cosmo, a friendly and concise Discord assistant. Keep responses helpful, conversational, and not overly long.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || "Cosmo had no response to give.";
  } catch (error) {
    console.error("OpenAI error:", error);
    return "I hit an error while generating the response. Try again in a moment.";
  }
}

client.on("ready", () => {
  console.log(`Cosmo is online: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!isAllowedUser(message.author.id)) return;

  const content = message.content.trim();
  const prefixRegex = new RegExp(`^${BOT_PREFIX.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`, "i");

  if (!prefixRegex.test(content)) return;

  const afterPrefix = content.replace(prefixRegex, "").trim();
  const cleanedText = afterPrefix.replace(/^\s*[,;:-]\s*/, "").trim();

  if (!cleanedText) {
    await message.reply("Cosmo is listening. Ask a question, or use: `hey cosmo, send 'hi' in #general`");
    return;
  }

  if (/^send\b/i.test(cleanedText)) {
    await sendAnonymousMessage(message, cleanedText);
    return;
  }

  const reply = await getCosmoReply(cleanedText);
  await message.reply({ content: reply, allowedMentions: { repliedUser: false } });
});

client.login(process.env.DISCORD_TOKEN);
