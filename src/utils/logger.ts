const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

function format(color: string, prefix: string, msg: string): string {
  return `${color}${prefix}${colors.reset} ${msg}`;
}

export const logger = {
  info(msg: string) {
    console.log(format(colors.blue, "ℹ", msg));
  },
  success(msg: string) {
    console.log(format(colors.green, "✓", msg));
  },
  warn(msg: string) {
    console.warn(format(colors.yellow, "⚠", msg));
  },
  error(msg: string) {
    console.error(format(colors.red, "✗", msg));
  },
  debug(msg: string) {
    if (process.env.DEBUG) {
      console.log(format(colors.gray, "·", msg));
    }
  },
  step(msg: string) {
    console.log(format(colors.cyan, "→", msg));
  },
  dim(msg: string) {
    console.log(`${colors.dim}${msg}${colors.reset}`);
  },
};
