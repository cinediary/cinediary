#!/usr/bin/env node
// Ambiente de desenvolvimento, igual em macOS, Linux, WSL e Windows (só precisa de Node e Docker).
// Chamado por `npm run <modo>` (package.json da raiz) ou `make <modo>` (Makefile da raiz):
//   dev    tudo: confere o ambiente, sobe banco + API, Svix em segundo plano e abre o Expo;
//   back   só o backend: banco + API e o Svix neste terminal (Ctrl+C fecha só o Svix);
//   front  só o Expo, apontando para a API local (o backend continua onde estiver);
//   build-dev   gera o development build no EAS (iOS por padrão; Android: PLATFORM=android ou `-- android`);
//   stop | logs-api | rebuild-api   atalhos do docker compose.
// O Expo abre no Expo Go (como hoje). Com o development build instalado no celular: DEV_CLIENT=1 (make) ou
// `-- --dev-client` (npm).
// Banco, Neo4j e API ficam rodando depois do Ctrl+C (o próximo `dev` é rápido); `stop` para tudo.
// Para desenvolver o backend em si, use o modo dev do Spring em cinediary-backend (`make run` / gradlew bootRun).
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACK = join(ROOT, 'cinediary-backend');
const APP = join(ROOT, 'cinediary-mobile');
const LOGS = join(ROOT, '.dev-logs');
const API = 'http://localhost:8080';
const WEBHOOK = `${API}/api/v1/webhooks/clerk`;
// O Clerk manda os eventos para https://play.svix.com/view/<id>/; o `svix listen` repassa o que chega lá para a API.
const SVIX_PLAY_ID = 'Bjn2RJsoLP7G7HivLEtBwyIklT6';
// No Windows, npx/npm/svix são .cmd: só rodam pelo shell.
const SHELL = process.platform === 'win32';

const color = (code) => (s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const [bold, green, yellow, red] = [color(1), color(32), color(33), color(31)];
const step = (s) => console.log(bold(s));
const ok = (s) => console.log(`  ${green('✓')} ${s}`);
const warn = (s) => console.log(`  ${yellow('!')} ${s}`);
const fail = (s) => {
  console.log(`  ${red('✗')} ${s}`);
  process.exit(1);
};
// Os avisos mostram o comando do jeito que a pessoa chamou: o make passa MAKELEVEL, o npm passa npm_lifecycle_event.
const cmd = (mode) =>
  process.env.MAKELEVEL ? `make ${mode}` : process.env.npm_lifecycle_event ? `npm run ${mode}` : `node scripts/dev.mjs ${mode}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (name) => join(LOGS, name);

/** Roda e espera; true se deu certo. {@code logFile}: guarda a saída lá em vez de mostrar. */
function run(cmd, args, { cwd = ROOT, logFile } = {}) {
  const r = spawnSync(cmd, args, { cwd, shell: SHELL, encoding: 'utf8', stdio: logFile ? 'pipe' : 'inherit' });
  if (logFile) appendFileSync(logFile, `$ ${cmd} ${args.join(' ')}\n${r.stdout ?? ''}${r.stderr ?? ''}\n`);
  return r.status === 0;
}
const has = (cmd) => spawnSync(cmd, ['--version'], { shell: SHELL, stdio: 'ignore' }).status === 0;

/** Lê um .env sem executá-lo (valores com espaços ou aspas não quebram nada). */
function readEnv(file) {
  const out = {};
  if (!existsSync(file)) return null;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

async function apiUp() {
  try {
    return (await fetch(`${API}/actuator/health`, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
}
const apiContainerRunning = () =>
  spawnSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8' }).stdout?.split(/\r?\n/).includes('cinediary-api');
const compose = (args, logFile) => run('docker', ['compose', '--profile', 'app', ...args], { cwd: BACK, logFile });

function checkDocker() {
  if (!has('docker')) fail('Docker não encontrado. Instale o Docker Desktop.');
  if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) fail('O Docker não está rodando. Abra o Docker Desktop e tente de novo.');
  ok('Docker');
}

function checkBackEnv() {
  const env = readEnv(join(BACK, '.env'));
  if (!env) fail('Falta cinediary-backend/.env (copie de .env.example e preencha).');
  const missing = ['CLERK_ISSUER', 'CLERK_WEBHOOK_SECRET', 'TMDB_API_TOKEN'].filter((k) => !env[k]);
  if (missing.length) fail(`Vazias em cinediary-backend/.env: ${missing.join(', ')}`);
  if (!env.CLERK_WEBHOOK_SECRET.startsWith('whsec_')) fail('CLERK_WEBHOOK_SECRET deve começar com whsec_.');
  ok('Backend (.env): Clerk, webhook e TMDB');
}

function checkAppEnv() {
  const env = readEnv(join(APP, '.env.local'));
  if (!env) fail('Falta cinediary-mobile/.env.local (copie de .env.example e preencha).');
  if (!env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_'))
    fail('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY em cinediary-mobile/.env.local deve começar com pk_.');
  ok('App (.env.local): Clerk');
  if (!existsSync(join(APP, 'node_modules'))) {
    // Primeira vez depois de clonar: sem as dependências o Expo nem abre.
    console.log('  … instalando as dependências do app (npm install, só na primeira vez)');
    if (!run('npm', ['install'], { cwd: APP, logFile: log('npm-install.log') })) fail('npm install falhou. Veja .dev-logs/npm-install.log');
    ok('Dependências do app instaladas');
  }
  if (!env.EXPO_PUBLIC_POSTHOG_API_KEY) warn('Sem EXPO_PUBLIC_POSTHOG_API_KEY: analytics e feature flags desligados.');
  const url = env.EXPO_PUBLIC_API_URL;
  if (url && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url))
    warn(`EXPO_PUBLIC_API_URL no .env.local é ${url}. Com localhost o app acha o IP do computador sozinho.`);
}

async function startBackend() {
  if ((await apiUp()) && !apiContainerRunning()) {
    // Já tem uma API na 8080 fora do Docker (ex.: o modo dev do Spring em outro terminal): usa ela.
    warn(`Já existe uma API rodando em ${API} (fora do Docker): vou usar essa.`);
    return;
  }
  writeFileSync(log('compose.log'), '');
  if (!compose(['up', '-d', '--build', '--wait', 'postgres', 'neo4j'], log('compose.log')))
    fail('Não subiu o banco/Neo4j. Veja .dev-logs/compose.log');
  ok('PostgreSQL e Neo4j');
  console.log('  … empacotando e subindo a API (a primeira vez demora alguns minutos)');
  if (!compose(['up', '-d', '--build', 'api'], log('compose.log'))) fail('Não subiu a API. Veja .dev-logs/compose.log');
  for (let i = 0; i < 90 && !(await apiUp()); i++) {
    if (!apiContainerRunning()) fail(`A API parou ao iniciar. Veja os logs: ${cmd('logs-api')}`);
    await sleep(2000);
  }
  if (!(await apiUp())) fail(`A API não respondeu em 3 min. Veja os logs: ${cmd('logs-api')}`);
  ok(`API em ${API} (logs: ${cmd('logs-api')})`);
}

function ensureSvix() {
  if (has('svix')) return;
  console.log('  … instalando o Svix CLI (npm install -g svix-cli)');
  if (!run('npm', ['install', '-g', 'svix-cli'], { logFile: log('svix-install.log') }))
    fail('Não consegui instalar o Svix CLI. Veja .dev-logs/svix-install.log');
}

/** Svix em segundo plano, com a saída no log; espera ele dizer que está escutando (até 15 s). */
async function startSvixBackground() {
  ensureSvix();
  const file = log('svix.log');
  writeFileSync(file, '');
  const fd = openSync(file, 'a');
  const child = spawn('svix', ['listen', '-t', SVIX_PLAY_ID, WEBHOOK], { shell: SHELL, stdio: ['ignore', fd, fd] });
  let exited = false;
  child.on('exit', () => (exited = true));
  for (let i = 0; i < 30; i++) {
    if (readFileSync(file, 'utf8').includes('now listening')) {
      ok(`Svix Play → ${WEBHOOK} (log: .dev-logs/svix.log)`);
      return child;
    }
    if (exited) fail('O Svix parou ao iniciar. Veja .dev-logs/svix.log');
    await sleep(500);
  }
  child.kill();
  fail('O Svix não conectou em 15 s. Veja .dev-logs/svix.log');
}

/** Abre um processo neste terminal e devolve quando ele fechar. O Ctrl+C vai para ele, não para este script. */
function foreground(cmd, args, opts = {}) {
  process.on('SIGINT', () => {}); // quem decide fechar é o processo filho (Expo, Svix)
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { shell: SHELL, stdio: 'inherit', ...opts });
    child.on('exit', (code) => resolve(code ?? 0));
  });
}

// localhost de propósito: em dev o app troca pelo IP do computador que roda o Metro (src/shared/config/env.ts),
// então funciona mesmo se o IP mudar (outra rede, hotspot), em qualquer sistema.
// Com o expo-dev-client instalado, o `expo start` abre o development build por padrão; --go mantém o Expo Go.
const useDevClient = process.argv.includes('--dev-client') || process.env.DEV_CLIENT === '1';
const startExpo = () => {
  ok(useDevClient ? 'Abrindo no development build' : `Abrindo no Expo Go (development build: ${process.env.MAKELEVEL ? 'DEV_CLIENT=1' : '-- --dev-client'})`);
  return foreground('npx', ['expo', 'start', useDevClient ? '--dev-client' : '--go'], {
    cwd: APP,
    env: { ...process.env, EXPO_PUBLIC_API_URL: API },
  });
};

/** EAS CLI instalado e logado (instala e pede o login se faltar). */
async function ensureEas() {
  if (!has('eas')) {
    console.log('  … instalando o EAS CLI (npm install -g eas-cli)');
    if (!run('npm', ['install', '-g', 'eas-cli'], { logFile: log('eas-install.log') }))
      fail('Não consegui instalar o EAS CLI. Veja .dev-logs/eas-install.log');
  }
  if (spawnSync('eas', ['whoami'], { cwd: APP, shell: SHELL, stdio: 'ignore' }).status !== 0) {
    warn('Você não está logado no Expo: entre com a sua conta (precisa ser membro da organização cinediary).');
    if ((await foreground('eas', ['login'], { cwd: APP })) !== 0) fail('Login no Expo não concluído.');
  }
  ok('EAS CLI logado');
}

const modes = {
  async dev() {
    step('1/4 Conferindo o ambiente');
    checkDocker();
    checkBackEnv();
    checkAppEnv();
    step('2/4 Banco, Neo4j e API');
    await startBackend();
    step('3/4 Webhook do Clerk (Svix)');
    const svix = await startSvixBackground();
    step('4/4 App (Expo)');
    await startExpo();
    svix.kill();
    step(`\nExpo e Svix fechados. Banco e API continuam rodando (${cmd('stop')} para parar).`);
  },
  async back() {
    step('1/3 Conferindo o ambiente');
    checkDocker();
    checkBackEnv();
    step('2/3 Banco, Neo4j e API');
    await startBackend();
    step(`3/3 Webhook do Clerk (Svix) — Ctrl+C fecha o Svix; banco e API continuam (${cmd('stop')} para parar)`);
    ensureSvix();
    // Neste terminal: as mensagens aparecem aqui, como quando você roda o svix na mão.
    await foreground('svix', ['listen', '-t', SVIX_PLAY_ID, WEBHOOK]);
  },
  async front() {
    step('App (Expo)');
    checkAppEnv();
    if (await apiUp()) ok(`API respondendo em ${API}`);
    else warn(`A API não está respondendo em ${API} (rode ${cmd('back')} em outro terminal).`);
    await startExpo();
  },
  async 'build-dev'() {
    const platform = process.argv.slice(3).find((a) => a === 'ios' || a === 'android') ?? process.env.PLATFORM ?? 'ios';
    if (platform !== 'ios' && platform !== 'android') fail(`Plataforma inválida: ${platform} (use ios ou android)`);
    // SIMULATOR=1: build para o simulador do iOS (não precisa de conta paga da Apple nem cadastrar aparelho).
    const profile = process.env.SIMULATOR === '1' && platform === 'ios' ? 'development-simulator' : 'development';
    step(`Development build (${platform}, perfil ${profile}) no EAS`);
    checkAppEnv();
    await ensureEas();
    const code = await foreground('eas', ['build', '--profile', profile, '--platform', platform], { cwd: APP });
    if (code !== 0) process.exit(code);
    step(`\nPronto: instale pelo link/QR acima. Depois abra o app com ${process.env.MAKELEVEL ? 'make front DEV_CLIENT=1' : 'npm run front -- --dev-client'}.`);
  },
  stop: () => compose(['down']) || process.exit(1),
  'logs-api': () => foreground('docker', ['logs', '-f', 'cinediary-api']),
  'rebuild-api': () => compose(['up', '-d', '--build', 'api']) || process.exit(1),
};

const mode = process.argv[2] ?? 'dev';
if (!modes[mode]) fail(`Modo desconhecido: ${mode} (use ${Object.keys(modes).join(', ')})`);
mkdirSync(LOGS, { recursive: true });
await modes[mode]();
