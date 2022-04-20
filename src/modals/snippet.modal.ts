import Discord from "discord.js"
import Snippet from "../entities/Snippet.entity.js"
import Client from "../struct/Client.js"
import languages from "../struct/client/iso6391.js"

export default async function createSnippet(
    interaction: Discord.ModalSubmitInteraction,
    client: Client
): Promise<void> {
    const customId = interaction.customId
    if (
        client.interactionInfo.has(customId) &&
        client.interactionInfo.get(customId).modalType === "snippetmodal"
    ) {
        const body = interaction.fields.getTextInputValue("body")
        const info = client.interactionInfo.get(customId)
        let snippet: Snippet
        if (info.subcommand === "add") {
            snippet = new Snippet()
            snippet.name = info.name
            snippet.language = info.language
            snippet.body = body
            snippet.aliases = []
            snippet.type = info.type
        } else if (info.subcommand === "edit") {
            if (info.existingSnippet.body === body)
                return client.response.sendError(
                    interaction,
                    client.messages.getMessage("noChange", interaction.locale)
                )
            snippet = info.existingSnippet
            snippet.body = body
        }
        await snippet.save()
        const past = info.subcommand === "add" ? "Added" : "Edited"
        const languageName = languages.getName(info.language)
        // prettier-ignore
        await client.response.sendSuccess(interaction, `${past} **${info.name}** ${info.type} in ${languageName}.`)
    }
}
