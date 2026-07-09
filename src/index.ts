import { Context, Schema } from 'koishi'
import { spawn } from 'node:child_process'

export const name = 'cloc'

export interface Config {
  excludeDirs: string[]
  workingDir: string
}

export const Config: Schema<Config> = Schema.object({
  excludeDirs: Schema.array(Schema.string()).default(['node_modules', 'dist', 'satori', 'upstream']),
  workingDir: Schema.string().default('external'),
})

export function apply(ctx: Context, config: Config) {
  ctx.command('cloc', '统计代码行数').action(async () => {
    const proc = await spawn('wsl', [
      'cloc',
      '--exclude-dir', config.excludeDirs.join(','),
      '--include_ext', 'ts,yml',
      config.workingDir, '--json'
    ], { stdio: 'pipe' })

    let buffer: string = ''
    for await (const chunk of proc.stdout)
      buffer += chunk
    return JSON.parse(buffer).SUM.code
  })
}
