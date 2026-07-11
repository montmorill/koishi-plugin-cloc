import { Context, h, Logger, Schema } from 'koishi'
import { spawn } from 'node:child_process'
import {} from '@koishijs/plugin-hmr'

export const name = 'cloc'
const logger = new Logger(name)

export interface Config {
  excludeDirs: string[]
  includeExts: string[]
  workingDir: string
}

export const Config: Schema<Config> = Schema.object({
  excludeDirs: Schema.array(Schema.string()).default(['node_modules', 'dist', 'lib', 'satori']),
  includeExts: Schema.array(Schema.string()).default(['ts', 'yml']),
  workingDir: Schema.string().default('external'),
})

async function countLoc(config: Config): Promise<number> {
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
  delete data.header
  logger.info('%o', data)
  return data.SUM.code
}

export async function apply(ctx: Context, config: Config) {
  let loc = await countLoc(config)
  ctx.on('hmr/reload', () => void countLoc(config).then((res) => loc = res))
  ctx.command('cloc', '统计代码行数').action(() => String(loc))
}
