import Client from "../struct/Client"
import Args from "../struct/Args"
import Command from "../struct/Command"
import Roles from "../util/roles"
import truncateString from "../util/truncateString"
import Discord from "discord.js"
import CommandMessage from "../struct/CommandMessage"

export default new Command({
    name: "query",
    aliases: ["sql"],
    description: "Evaluate an SQL query.",
    permission: Roles.BOT_DEVELOPER,
    args: [
        {
            name: "query",
            description: "SQl query.",
            required: true,
            optionType: "STRING"
        }
    ],
    async run(this: Command, client: Client, message: CommandMessage, args: Args) {
        const query = args.removeCodeblock(args.consumeRest(["query"]))

        try {
            const out = JSON.stringify(await client.db.query(query), null, 2)
            client.response.sendSuccess(message, {
                author: { name: "Output" },
                description: `\`\`\`${truncateString(out, 1994)}\`\`\``
            })
        } catch (error) {
            const err = error.message || "\u200B"
            client.response.sendError(
                message,
                {
                    author: { name: "Error" },
                    description: `\`\`\`${truncateString(err, 1994)}\`\`\``
                },
                false
            )
        }
    }
})
