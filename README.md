# discord-cosmo-bot

A Discord bot that listens for the trigger phrase "hey cosmo" from approved user IDs and:

- answers questions using OpenAI
- sends anonymous messages to a Discord channel when given a target like `#general`
- uses the two user IDs from Sproutbot's `ID.env` by default

## Setup

1. Install dependencies:
   npm install

2. Fill in your values in `.env`:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `ALLOWED_USER_IDS`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional)

3. Start the bot:
   npm start

## Trigger format

- `hey cosmo, what's the weather like?`
- `hey cosmo, send 'hi' in #general`
- `hey cosmo, send "hello" in #announcements`

## Notes

The default allowed IDs are pulled from the Sproutbot config:

- `1008761704877924362`
- `1033876111576285265`

Copy those into your bot's `.env` if needed.
