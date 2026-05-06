const ping = require('ping');
const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const dns = require('dns');
const defaultGateway = require('default-gateway');

const LOG_FILE = path.join(__dirname, 'ping_monitor.log');
const INTERVAL_MS = 5000;

function parseTarget(arg) {
    try {
        const urlStr = arg.startsWith('http') ? arg : `http://${arg}`;
        const url = new URL(urlStr);
        return url.hostname;
    } catch {
        return arg;
    }
}

function getRouterIp() {
    try {
        const { gateway } = defaultGateway.v4.sync();
        return gateway;
    } catch (err) {
        console.error(pc.yellow(`Aviso: não foi possível obter o IP do roteador (${err.message})`));
        return null;
    }
}

function getDnsIp() {
    try {
        const servers = dns.getServers();
        // Prioriza um servidor IPv4 não-loopback; cai no primeiro disponível.
        const ipv4 = servers.find(s => !s.includes(':') && !s.startsWith('127.'));
        return ipv4 || servers[0] || null;
    } catch (err) {
        console.error(pc.yellow(`Aviso: não foi possível obter o IP do DNS (${err.message})`));
        return null;
    }
}

function getDefaultTargets() {
    const router = getRouterIp();
    const dnsIp = getDnsIp();

    const list = [];
    if (router) list.push({ label: 'router', host: router });
    if (dnsIp) list.push({ label: 'dns', host: dnsIp });
    list.push({ label: 'google', host: 'google.com' });
    return list;
}

const rawArgs = process.argv.slice(2);
const targets = rawArgs.length === 0
    ? getDefaultTargets()
    : rawArgs.map(arg => ({ label: arg, host: parseTarget(arg) }));

if (targets.length === 0) {
    console.error(pc.red('Erro: nenhum alvo disponível para monitorar.'));
    process.exit(1);
}

async function monitor() {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const promises = targets.map(t => ping.promise.probe(t.host, { timeout: 2 }));
    const results = await Promise.all(promises);

    const logParts = [];
    const consoleParts = [];

    results.forEach((res, idx) => {
        const target = targets[idx];
        const pingTime = res.alive ? `${Math.round(res.time).toString()}ms` : 'n/a';
        const rawText = `${target.host} ${pingTime.padStart(5, ' ')}`;

        logParts.push(rawText);

        let coloredText;
        if (!res.alive) {
            coloredText = pc.red(rawText);
        } else if (res.time > 150) {
            coloredText = pc.yellow(rawText);
        } else {
            coloredText = pc.green(rawText);
        }

        consoleParts.push(coloredText);
    });

    const separator = ' || ';
    const logLine = `${timeStr} - ${logParts.join(separator)}\n`;
    const consoleLine = `${pc.gray(timeStr)} - ${consoleParts.join(separator)}`;

    console.log(consoleLine);
    fs.appendFile(LOG_FILE, logLine, (err) => {
        if (err) console.error(pc.bgRed(pc.white(` Erro ao escrever no log: ${err.message} `)));
    });
}

console.log(pc.cyan('Iniciando monitoramento. Pressione Ctrl+C para parar.'));
if (rawArgs.length === 0) {
    console.log(pc.cyan('Modo padrão: roteador, DNS e google.com'));
}
console.log(pc.cyan('Alvos: ') + targets.map(t => `${t.label}=${t.host}`).join(', '));
console.log(pc.cyan(`Arquivo de log: ${LOG_FILE}`));

monitor();
setInterval(monitor, INTERVAL_MS);
