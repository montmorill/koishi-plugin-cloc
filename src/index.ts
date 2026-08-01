import { Context, Schema } from 'koishi'
import { spawn } from 'node:child_process'
import {} from '@koishijs/plugin-hmr'

export const name = 'cloc'

export interface Config {
  workingDir: string
  excludeDirs: string[]
  extraArgs: string[]
}

export const Config: Schema<Config> = Schema.object({
  workingDir: Schema.string().role('folder').default('external'),
  excludeDirs: Schema.array(Schema.string()).default([
    'node_modules',
    'dist', 'lib',
    'satori', 'database'
  ]),
  extraArgs: Schema.array(Schema.string()).experimental().default([]),
})

const types = ['nFiles', 'blank', 'comment', 'code'] as const
type ClocOutput = Record<"SUM" | string, Record<typeof types[number], number>>

async function cloc(config: Config): Promise<ClocOutput> {
  let command = 'cloc'
  const args = [
    '--exclude-dir', config.excludeDirs.join(','),
    '--quiet',
    '--json',
    config.workingDir,
    ...config.extraArgs,
  ]

  if (process.platform === 'win32') {
    args.unshift(command)
    command = 'wsl'
  }

  const proc = await spawn(command, args, { stdio: 'pipe' })

  let buffer: string = ''
  for await (const chunk of proc.stdout)
    buffer += chunk
  const data = JSON.parse(buffer)

  delete data.header
  return data
}

export async function apply(ctx: Context, config: Config) {
  let loc = await cloc(config)
  ctx.on('hmr/reload', () => void cloc(config).then((res) => loc = res))

  const command = ctx.command('cloc')
    .option('lang', '-l <lang>')
    .option('type', '-t <type>', { type: types })
    .option('type', '--n-files', { value: 'nFiles' })
    .option('type', '--blank', { value: 'blank' })
    .option('type', '--comment', { value: 'comment' })
    .option('type', '--code', { value: 'code' })
    .action(({ session, options }) => {
      const type: typeof types[number] = options?.type || 'code'
      const lang = options?.lang || 'SUM'
      if (lang in loc)
        return String(loc[lang][type])
      return session?.text('.lang-not-found')
    })

  command.subcommand('.list')
    .action(() => Object.keys(loc).join('\n'))
}
