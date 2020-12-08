import Discord from "discord.js"
import Message from "./discord/Message"

export default class Args {
    raw: string
    separator?: string
    message: Message

    constructor(value: string, message: Message) {
        this.raw = value.trim()
        this.message = message
    }

    get split(): string[] {
        return this.separator
            ? this.raw.split(this.separator).map(arg => arg.trim())
            : this.raw.split(/\s/)
    }

    get splitMultiple(): string[] {
        return this.separator ? this.split : this.raw.split(/\s+/)
    }

    consume(): string
    consume(count: number): string[]
    consume(count?: number): string | string[] {
        let args: string | string[]
        if (!count) args = this.split[0]
        else args = this.splitMultiple.slice(0, count)

        this.remove(count)
        return args
    }

    consumeRest(): string
    consumeRest(count: number): string[]
    consumeRest(count?: number): string | string[] {
        if (!count) {
            const args = this.raw.trim()
            this.raw = ""
            return args
        } else {
            const args = this.consume(count - 1)
            args.push(this.consumeRest())
            return args
        }
    }

    remove(count: number = 1): string {
        // matches any character multiple times until a space is found or the string ends, 1 to [count] times
        const regex = new RegExp(`^([^\\s]+(\\s+|$)){1,${count}}`)
        this.raw = this.raw.replace(regex, "")
        return this.raw
    }

    removeCodeblock(): string {
        return (this.raw = this.raw
            .replace(/^`(``)?([a-z]+\n)?/i, "")
            .replace(/`(``)?$/, "")
            .trim())
    }

    consumeSnowflake(anywhere: boolean = true): Discord.Snowflake {
        const regex = anywhere ? /\d{18}/ : /^\d{18}/
        const snowflake = this.raw.match(regex)?.[0]
        if (!snowflake) return null

        this.raw = this.raw.replace(new RegExp(`.+?${snowflake}.+?`), "").trim()
        return snowflake
    }
}
