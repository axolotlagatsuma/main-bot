import typeorm from "typeorm"
import Discord from "discord.js"
import type Client from "../struct/Client.js"
import { quote } from "@buildtheearth/bot-utils"
import { Cron } from "croner";

@typeorm.Entity({ name: "banner_images" })
export default class BannerImage extends typeorm.BaseEntity {
    @typeorm.PrimaryGeneratedColumn()
    id: number

    @typeorm.Column()
    url: string

    @typeorm.Column()
    credit: string

    @typeorm.Column()
    location: string

    @typeorm.Column({ length: 512, nullable: true })
    description?: string

    @typeorm.DeleteDateColumn({ name: "deleted_at" })
    deletedAt?: Date

    format(): string {
        return `**#${this.id}:** [Link](${this.url}), by ${this.credit}`
    }

    private static cycleTimeout: Cron

    static async cycle(client: Client): Promise<void> {
        if (!(await client.customGuilds.main()).features.includes("BANNER")) return
        const next = await this.findOne({ order: { id: "ASC" } })

        if (!next) {
            client.logger.warn("[BannerImage] Queue is empty; cannot update banner.")
            return
        }

        await (await client.customGuilds.main()).setBanner(next.url)
        const updates = (await client.customGuilds.main()).channels.cache.find(
            channel => channel.name === "updates"
        ) as Discord.TextChannel

        const embed: Discord.MessageEmbedOptions = {
            author: { name: "New banner!" },
            description: `This week's banner was built by **${next.credit}**, and it's located in **${next.location}**.`,
            image: next
        }

        if (next.description) embed.description += `\n\n${quote(next.description)}`

        await client.response.sendSuccess(updates, embed)
        await next.softRemove()
        client.logger.info("Updated banner with first image in queue.")
    }

    static schedule(client: Client): void {
        if (this.cycleTimeout) this.cycleTimeout.stop()

        this.cycleTimeout = new Cron("0 0 * * 1", () => {
            this.cycle(client)
        })
    }
}
