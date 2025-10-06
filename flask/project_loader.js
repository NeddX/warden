const path = require("path");
const fs = require("fs");
const vm = require("vm");
const kleur = require("kleur");

const al = require("./alchemical");
const lg = require("./logger");
const { ErrType,
        Ok,
        Err,
        is_ok,
        is_err } = require("./error");

function load_project(project_file) {
    let result = {};

    const resolved_path = path.resolve(project_file);

    if (!fs.existsSync(resolved_path)) {
        result = Err({
            ok: false,
            err: {
                type: ErrType.NOT_FOUND,
                message: `${resolved_path} no such file or directory`,
            }
        });
        return result;
    }

    const project_code = fs.readFileSync(resolved_path, "utf8");

    const sandbox = {
        __dirname: path.dirname(resolved_path),
        __filename: path.basename(resolved_path),
        global: {},
    };
    sandbox.process = process;
    sandbox.console = console;
    sandbox.Flask = al.Flask;
    sandbox.Files = al.Files;
    sandbox.Languages = al.Languages;
    sandbox.Compiler = al.Compiler;
    sandbox.ProjectType = al.ProjectType;
    sandbox.LEVEL_INFO = lg.LEVEL_INFO;
    sandbox.LEVEL_DEBUG = lg.LEVEL_DEBUG;
    sandbox.LEVEL_WARN = lg.LEVEL_WARN;
    sandbox.LEVEL_ERROR = lg.LEVEL_ERROR;
    sandbox.LEVEL_FATAL = lg.LEVEL_FATAL;

    try {
        vm.createContext(sandbox);
        vm.runInNewContext(project_code, sandbox, { filename: path.basename(resolved_path) });
    }
    catch (err) {
        lg.Logger.error(kleur.red("Failed to parse project file"));
        throw err;
    }

    return al.Flask.__current_project;
}

module.exports = {
    load_project,
};
