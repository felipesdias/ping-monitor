const ping = require('ping');
const fs = require('fs');
const path = require('path');
const pc = require('picocolors');

const rawArgs = process.argv.slice(2);

if (rawArgs.length === 0) {
    console.error(pc.red("Erro: Nenhum IP ou URL fornecido."));
    console.log("Uso: node monitor.js 8.8.8.8 google.com https://api.meusite.com");
    process.exit(1);
}

const targets = rawArgs.map(arg => {
    try {
        const urlStr = arg.startsWith('http') ? arg : `http://${arg}`;
        const url = new URL(urlStr);
        return url.hostname;
    } catch {
        return arg;
    }
});

const LOG_FILE = path.join(__dirname, 'ping_monitor.log');
const INTERVAL_MS = 5000;

async function monitor() {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    
    const promises = targets.map(target => ping.promise.probe(target, { timeout: 2 }));
    const results = await Promise.all(promises);

    const logParts = [];
    const consoleParts = [];

    results.forEach(res => {
        const pingTime = res.alive ? `${Math.round(res.time).toString()}ms` : 'n/a';
        const rawText = `${res.host} ${pingTime.padStart(5, ' ')}`;
        
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
console.log(pc.cyan(`Arquivo de log: ${LOG_FILE}`));

monitor();
setInterval(monitor, INTERVAL_MS);