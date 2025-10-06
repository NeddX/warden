const LEVEL_INFO = "[info]:";
const LEVEL_DEBUG = "[debug]:";
const LEVEL_WARN = "[warn]:";
const LEVEL_ERROR = "[error]:";
const LEVEL_FATAL = "[fatal]:";

const Logger = {
    debug_logs: true,

    info(fmt) {
        process.stdout.write(`${fmt}\n`);
    },
    error(fmt) {
        process.stderr.write(`${LEVEL_ERROR} ${fmt}\n`);
    },
    debug(fmt) {
        if (this.debug_logs) {
            process.stdout.write(`${LEVEL_DEBUG} ${fmt}\n`);
        }
    }
};

module.exports = {
    Logger,
    LEVEL_INFO,
    LEVEL_DEBUG,
    LEVEL_ERROR,
    LEVEL_FATAL
};
