# ping-monitor

A small cross-platform CLI that periodically pings one or more hosts, prints color-coded latency to the console, and appends a plain-text log file.

Works on **Linux**, **macOS**, and **Windows**.

## Features

- Pings multiple hosts in parallel every 5 seconds.
- Color-coded console output:
  - **green** &mdash; reachable, latency &le; 150&nbsp;ms
  - **yellow** &mdash; reachable, latency > 150&nbsp;ms
  - **red** &mdash; unreachable / timeout
- Appends every sample to `ping_monitor.log` (no colors, easy to grep).
- **Default mode**: when no targets are passed, automatically monitors:
  1. The default gateway (router) &mdash; detected via [`default-gateway`](https://www.npmjs.com/package/default-gateway).
  2. The system DNS server &mdash; detected via Node's built-in `dns.getServers()`.
  3. `google.com`.
- Accepts hostnames, IPs, or full URLs (the hostname is extracted automatically).

## Requirements

- [Node.js](https://nodejs.org/) **22+**
- The `ping` system command available on `PATH` (preinstalled on Linux, macOS, and Windows).

## Installation

```bash
git clone https://github.com/felipesdias/ping-monitor.git
cd ping-monitor
npm install
```

## Usage

### Default mode (router + DNS + google.com)

```bash
npm start
# or
node main.js
```

Example output:

```
Starting monitoring. Press Ctrl+C to stop.
Default mode: router, DNS and google.com
Targets: router=192.168.0.1, dns=1.1.1.1, google=google.com
Log file: /path/to/ping-monitor/ping_monitor.log
10:34:12 - 192.168.0.1   4ms || 1.1.1.1  22ms || google.com  17ms
10:34:17 - 192.168.0.1   3ms || 1.1.1.1  21ms || google.com  19ms
```

### Custom targets

Pass any combination of IPs, hostnames, or URLs:

```bash
node main.js 8.8.8.8 github.com https://api.example.com
```

Press `Ctrl+C` to stop.

## Log file

A line is appended to `ping_monitor.log` (next to `main.js`) for every sample, in the same order the targets were passed:

```
10:34:12 - 192.168.0.1   4ms || 1.1.1.1  22ms || google.com  17ms
10:34:17 - 192.168.0.1   3ms || 1.1.1.1 n/a || google.com  19ms
```

`n/a` means the host did not reply within the timeout.

## Configuration

The two main knobs live at the top of `main.js`:

| Constant       | Default                  | Description                       |
| -------------- | ------------------------ | --------------------------------- |
| `LOG_FILE`     | `./ping_monitor.log`     | Where samples are appended.       |
| `INTERVAL_MS`  | `5000`                   | Time between probe rounds (ms).   |

The per-probe timeout is `2` seconds and is set inline in the `ping.promise.probe` call.

## How it works

- Pings are issued in parallel using the [`ping`](https://www.npmjs.com/package/ping) package, which wraps the OS `ping` binary.
- The router IP comes from [`default-gateway`](https://www.npmjs.com/package/default-gateway) (uses `netstat` on macOS, `ip route` on Linux, `route print` on Windows).
- The DNS IP comes from Node's [`dns.getServers()`](https://nodejs.org/api/dns.html#dnsgetservers), which reflects the resolver configured on the host OS.
- Console colors are applied with [`picocolors`](https://www.npmjs.com/package/picocolors); the log file stays plain text.

## License

ISC
