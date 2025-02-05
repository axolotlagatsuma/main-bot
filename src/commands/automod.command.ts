import Client from "../struct/Client.js"
import Command from "../struct/Command.js"

import CommandMessage from "../struct/CommandMessage.js"
import Args from "../struct/Args.js"
import BannedWord from "../entities/BannedWord.entity.js"
import Discord from "discord.js"
import {
    formatPunishmentTime,
    hexToNum,
    humanizeArray,
    humanizeConstant,
    truncateString
} from "@buildtheearth/bot-utils"

const punishmentTypes = ["BAN", "MUTE", "KICK", "WARN", "DELETE"]

export default new Command({
    name: "automod",
    aliases: ["am"],
    description: "Manage banned words",
    subcommands: [
        {
            name: "block",
            description: "Manage blocked words",
            group: true,
            subcommands: [
                {
                    name: "add",
                    description: "Add a blocked word",
                    args: [
                        {
                            name: "word",
                            description: "Word to block.",
                            required: true,
                            optionType: "STRING"
                        },
                        {
                            name: "punishment",
                            description: "Punishment to give",
                            required: true,
                            optionType: "STRING",
                            choices: punishmentTypes
                        },
                        {
                            name: "reason",
                            description: "Punishment reason.",
                            required: true,
                            optionType: "STRING"
                        },
                        {
                            name: "duration",
                            description: "Punishment duration.",
                            required: false,
                            optionType: "STRING"
                        },
                        {
                            name: "regex",
                            description: "Whether the provided string is a regex or not.",
                            required: false,
                            optionType: "BOOLEAN"
                        }
                    ]
                },
                {
                    name: "remove",
                    description: "Remove a blocked word",
                    args: [
                        {
                            name: "word",
                            description: "Word to remove.",
                            required: true,
                            optionType: "STRING"
                        }
                    ]
                },
                {
                    name: "list",
                    description: "List all blocked words."
                }
            ]
        },
        {
            name: "except",
            description: "Manage exceptions",
            group: true,
            subcommands: [
                {
                    name: "add",
                    description: "Add an exception",
                    args: [
                        {
                            name: "word",
                            description: "Word to except.",
                            required: true,
                            optionType: "STRING"
                        }
                    ]
                },
                {
                    name: "remove",
                    description: "Remove a blocked word",
                    args: [
                        {
                            name: "word",
                            description: "Word to remove from exceptions.",
                            required: true,
                            optionType: "STRING"
                        }
                    ]
                },
                {
                    name: "list",
                    description: "List all exceptions."
                }
            ]
        }
    ],
    permission: [
        globalThis.client.roles.SENIOR_MODERATOR,
        globalThis.client.roles.MANAGER
    ],
    async run(this: Command, client: Client, message: CommandMessage, args: Args) {
        const subcommandGroup = args.consumeSubcommandGroupIf(["block", "except"])
        if (!subcommandGroup)
            return message.sendErrorMessage(
                "specifyValidSubGr",
                humanizeArray(this.subcommands?.map(ele => ele.name) || [])
            )
        if (subcommandGroup === "block") {
            const validSubcommands = ["add", "remove", "list"]
            const subcommand = args.consumeSubcommandIf(validSubcommands)
            if (!subcommand || subcommand === "list") {
                await getList(false, message, client)
            }
            if (subcommand === "add") {
                const word = args.consume("word")
                if (!word) return await message.sendErrorMessage("invalidWord")

                await message.continue()
                const punishment = args.consume("punishment").toUpperCase()
                if (word.length > 99) {
                    return await message.sendErrorMessage("wordTooLong99")
                }
                if (!punishmentTypes.includes(punishment))
                    return message.sendErrorMessage(
                        "specifyValidPunish",
                        humanizeArray(punishmentTypes)
                    )
                const reason = client.placeholder.replacePlaceholders(
                    args.consume("reason")
                )
                if (!reason && punishment !== "DELETE")
                    return await message.sendErrorMessage("specifyReason")
                const duration = args.consumeLength("duration")
                if (
                    duration === null &&
                    punishment !== "WARN" &&
                    punishment !== "KICK" &&
                    punishment !== "DELETE"
                )
                    return await message.sendErrorMessage("specifyDuration")
                const isAlreadyThere = client.filterWordsCached.banned.get(word)
                if (isAlreadyThere)
                    return await message.sendErrorMessage("wordAlreadyBanned")

                const regex = args.consumeBoolean("regex")

                if (regex) {
                    let validRegex = true
                    try {
                        new RegExp(word)
                    } catch (_) {
                        validRegex = false
                    }

                    if (!validRegex) return await message.sendErrorMessage("invalidRegex")
                }

                await BannedWord.createBannedWord(
                    {
                        word: word,
                        punishment_type: punishment as
                            | "BAN"
                            | "MUTE"
                            | "WARN"
                            | "KICK"
                            | "DELETE",
                        reason: reason,
                        duration: isNaN(duration !== null ? duration : NaN)
                            ? null
                            : duration !== null
                            ? duration
                            : null,
                        exception: false,
                        regex: regex
                    },
                    client
                )

                return await message.sendSuccessMessage("addedWord")
            }
            if (subcommand === "remove") {
                const word = args.consumeRest(["word"])
                if (!word) return await message.sendErrorMessage("invalidWord")
                await message.continue()
                const isThere = client.filterWordsCached.banned.get(word)
                if (!isThere) return message.sendErrorMessage("wordNotBanned")
                await isThere?.deleteWord(client)
                return await message.sendSuccessMessage("wordDeleted")
            }
        }
        if (subcommandGroup === "except") {
            const validSubcommands = ["add", "remove", "list"]
            const subcommand = args.consumeSubcommandIf(validSubcommands)
            if (!subcommand || subcommand === "list") {
                await getList(true, message, client)
            }
            if (subcommand === "add") {
                const word = args.consumeRest(["word"])

                if (!word) return await message.sendErrorMessage("invalidWord")
                if (word.length > 99) {
                    return message.sendErrorMessage("wordTooLong99")
                }
                await message.continue()
                const isAlreadyThere = client.filterWordsCached.except.includes(word)
                if (isAlreadyThere)
                    return await message.sendErrorMessage("wordAlreadyBanned")

                await BannedWord.createBannedWord(
                    {
                        word: word,
                        punishment_type: undefined,
                        reason: undefined,
                        duration: null,
                        exception: true
                    },
                    client
                )

                return await message.sendSuccessMessage("addedWord")
            }
            if (subcommand === "remove") {
                const word = args.consumeRest(["word"])
                if (!word) return await message.sendErrorMessage("invalidWord")
                await message.continue()
                const isThere = await BannedWord.findOne({
                    exception: true,
                    word: word
                })
                if (!isThere) return message.sendErrorMessage("wordNotBanned")
                await isThere.deleteWord(client)
                return await message.sendSuccessMessage("deletedWord")
            }
        }
    }
})

async function getList(
    exception: boolean,
    message: CommandMessage,
    client: Client
): Promise<void | CommandMessage> {
    await message.continue()
    const words = await BannedWord.find({ exception: exception })
    const wordEmbeds = [
        {
            color: hexToNum("#1EAD2F"),
            author: { name: `${!exception ? "Word" : "Exception"} list` },
            description: ""
        }
    ]
    let currentEmbed = 0
    for (const word of words) {
        if (
            [
                ...(
                    wordEmbeds[currentEmbed].description +
                    (exception
                        ? `• ${word.word}\n`
                        : `• ||${word.word}|| - ${
                              word.punishment_type !== undefined
                                  ? humanizeConstant(word.punishment_type)
                                  : ""
                          } ${
                              word.duration !== null && word.duration !== undefined
                                  ? formatPunishmentTime(word.duration)
                                  : ""
                          } for reason ${
                              word.reason !== undefined
                                  ? truncateString(word.reason, 20)
                                  : ""
                          }\n`)
                )
                    .split("_")
                    .join("\\_")
            ].length > 4096
        ) {
            currentEmbed += 1
            wordEmbeds.push({
                color: hexToNum("#1EAD2F"),
                author: {
                    name: `${!exception ? "Word" : "Exception"} list pt. ${
                        currentEmbed + 1
                    }`
                },
                description: ""
            })
        }
        wordEmbeds[currentEmbed].description += exception
            ? `• ${word.word}\n`
            : `• ||${word.word}|| - ${
                  word.punishment_type !== undefined
                      ? humanizeConstant(word.punishment_type)
                      : ""
              } ${
                  word.duration !== null && word.duration !== undefined
                      ? formatPunishmentTime(word.duration)
                      : ""
              } for reason ${
                  word.reason !== undefined ? truncateString(word.reason, 20) : ""
              }\n`
    }
    if (wordEmbeds.length <= 1) return message.send({ embeds: wordEmbeds })
    let row = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(
        new Discord.ButtonBuilder()
            .setCustomId(`${message.id}.forwards`)
            .setLabel(client.config.emojis.right.toString())
            .setStyle(Discord.ButtonStyle.Success)
    )
    const sentMessage = await message.send({
        embeds: [wordEmbeds[0]],
        components: [row]
    })

    let page = 1
    let old = 1

    const interactionFunc = async (interaction: Discord.Interaction) => {
        if (
            !(
                interaction.isButton() &&
                [`${message.id}.back`, `${message.id}.forwards`].includes(
                    interaction.customId
                )
            )
        )
            return
        if (interaction.user.id !== message.member.id)
            return interaction.reply({
                content: message.messages.wrongUser,
                ephemeral: true
            })
        if (
            (interaction as Discord.ButtonInteraction).customId ===
            `${message.id}.forwards`
        )
            page += 1
        if ((interaction as Discord.ButtonInteraction).customId === `${message.id}.back`)
            page -= 1
        if (page === 1) {
            row = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${message.id}.forwards`)
                    .setLabel(client.config.emojis.right.toString())
                    .setStyle(Discord.ButtonStyle.Success)
            )
        } else if (page === wordEmbeds.length) {
            row = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${message.id}.back`)
                    .setLabel(client.config.emojis.left.toString())
                    .setStyle(Discord.ButtonStyle.Success)
            )
        } else {
            row = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()

                .addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId(`${message.id}.back`)
                        .setLabel(client.config.emojis.left.toString())
                        .setStyle(Discord.ButtonStyle.Success)
                )
                .addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId(`${message.id}.forwards`)
                        .setLabel(client.config.emojis.right.toString())
                        .setStyle(Discord.ButtonStyle.Success)
                )
        }

        if (old === page) return
        old = page

        const embed = wordEmbeds[page - 1]
        await (interaction as Discord.ButtonInteraction).update({
            components: [row]
        })
        if (interaction.message instanceof Discord.Message) {
            try {
                await interaction.message.edit({ embeds: [embed] })
            } catch {
                interaction.editReply({ embeds: [embed] })
            }
        } else interaction.editReply({ embeds: [embed] })
    }
    // @ts-ignore Honestly this is so annoying
    client.on("interactionCreate", interactionFunc)
    setTimeout(async () => {
        await sentMessage.edit({ content: "Expired", components: [] })
        // @ts-ignore Honestly this is so annoying
        client.off("interactionCreate", interactionFunc)
    }, 600000)
}
