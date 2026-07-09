import { Context, Schema } from 'koishi'
import { spawn } from 'node:child_process'
import {} from '@koishijs/loader'
import {} from '@koishijs/plugin-hmr'


export const name = 'cloc'

export interface Config {
  excludeDirs: string[]
  includeExts: string[]
  workingDir: string
}

export const Config: Schema<Config> = Schema.object({
  excludeDirs: Schema.array(Schema.string()).default(['node_modules', 'dist', 'satori']),
  includeExts: Schema.array(Schema.string()).default(['ts', 'yml']),
  workingDir: Schema.string().default('external'),
})

async function countLoc(config: Config) {
  const proc = await spawn('wsl', [
    'cloc',
    '--exclude-dir', config.excludeDirs.join(','),
    '--include-ext', config.includeExts.join(','),
    config.workingDir, '--json'
  ], { stdio: 'pipe' })

  let buffer: string = ''
  for await (const chunk of proc.stdout)
    buffer += chunk
  const data = JSON.parse(buffer)
  return data.SUM.code
}

export async function apply(ctx: Context, config: Config) {
  let loc = await countLoc(config)
  ctx.on('hmr/reload', async () => loc = await countLoc(config))
  ctx.command('cloc', '统计代码行数').action(() => loc)
}
