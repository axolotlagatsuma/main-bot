import Client from "../struct/Client"
import Discord from "discord.js"
import ModerationMenu from "../entities/ModerationMenu"
import noop from "../util/noop"

export default async function (
    this: Client,
    oldMessage: Discord.Message,
    newMessage: Discord.Message
): Promise<unknown> {
    if (newMessage.partial) await newMessage.fetch().catch(noop)

    if (newMessage.author.bot) return

    const bannedWords = this.filter.findBannedWord(newMessage.content)
    if (bannedWords.length >= 1)
        return ModerationMenu.createMenu(newMessage, bannedWords, this)
}
