#!/usr/bin/env node

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const fs = require("fs");
const path = require("path");
const proc = require("node:child_process");
const kleur = require("kleur");
const fg = require("fast-glob");

const al = require("./alchemical");
const { Logger } = require("./logger");
const { ErrType,
        Ok,
        Err,
        is_ok,
        is_err,
        unwrap } = require("./error");
const loader = require("./project_loader");

require("./languages/asm.js");
require("./languages/cxx.js");
require("./languages/c.js");
require("./compilers/gcc.js");

yargs(hideBin(process.argv))
    .command({
        command: "build [target]",
        describe:
        "Build the project at the current working directory.\n" +
            "If --file option was not specified, then flask will look for a project.alproj in the current directory.",
        builder: (yargs) => {
            return yargs
                .positional("target", {
                    describe: "The target to build (optional).",
                    type: "string",
                })
                .option("file", {
                    describe: "The project file location.",
                    demandOption: false,
                    alias: "f",
                    type: "string",
                })
                .option("clean", {
                    describe: "Clean start",
                    demandOption: false,
                    alias: "c",
                    type: "boolean",
                })
                .option("define", {
                    describe: "Define a configuration variable.",
                    demandOption: false,
                    alias: "d",
                    type: "string",
                    array: true,
                    coerce: (args) => {
                        const vars = {};
                        (Array.isArray(args) ? args : [args]).forEach((arg) => {
                            arg.split(",").forEach((pair) => {
                                const [key, value] = pair.split("=");
                                if (key && value !== undefined) {
                                    vars[key.trim()] = value.trim().replace(/^"|"$/g, ""); // strip quotes
                                }
                            });
                        });
                        return vars;
                    },
                });
        },
        handler: build_handler,
    })
    .command({
        command: "init",
        describe: "Initialize Flask for the current project.",
        builder: {},
        handler: init_handler,
    })
    .alias("help", "h")
    .alias("version", "v")
    .parse();

function build_handler(argv) {
    Logger.debug_logs = (process.env["FLASK_DEBUG"] == "1");
    let project_file = al.FlaskDefines.DEFAULT_PROJECT_FILE_NAME;

    Logger.debug(JSON.stringify(argv, 2, null));

    if (argv.file) {
        project_file = argv.file;
    }
    else {
        const files = fg.sync("./*.flask", { absolute: true });
        if (files.length >= 1) {
            project_file = files[0];
        }
        else {
            if (!fs.existsSync(project_file)) {
                Logger.error(`${project_file}: no such file or directory`);
                return;
            }
        }
    }

    if (!fs.existsSync(".flask/")) {
        const flask_conf = {
            version: [ 0, 0, 0 ],
            build_count: 0,
            unit_count: 0,
            current_unit_count: 0,
            vars: {},
        };

        fs.mkdirSync(".flask/", { recursive: true });
        fs.writeFileSync(".flask/flask.conf", JSON.stringify(flask_conf, null, 2) + "\n", "utf8");
    }

    let flask_conf = JSON.parse(fs.readFileSync(".flask/flask.conf", "utf8"));

    if (argv.define) {
        for (const [key, value] of Object.entries(argv.define)) {
            flask_conf.vars[key] = value;
        }
    }

    // Reset unit count in case the targets get updated
    flask_conf.unit_count = 0;
    flask_conf.current_unit_count = 0;

    const project = build_project({
        cwd: path.dirname(project_file),
        argv: argv,
        parent: null,
        project_dir: project_file,
        conf: flask_conf,
    });

    flask_conf.build_count++;
    flask_conf.version = project.version;

    fs.writeFileSync(".flask/flask.conf", JSON.stringify(flask_conf, null, 2) + "\n", "utf8");
}

function init_handler(argv) {
    /*
      Logger.info(`project name: ${project.name}`);
      Logger.info(`C Compiler: ${project.configuration.cc}`);
      Logger.info(`C++ Compiler: ${project.configuration.cxx}`);
      Logger.info(`Source files: ${resolve_globd(project.sources)}`);
    */
    Logger.info("Init...");
}

function build_project(project_build_info) {
    const resolved_path = path.resolve(project_build_info.cwd, project_build_info.project_dir);

    al.Flask.__init();

    const current_project = al.Flask.__current_project;
    current_project.__argv = project_build_info.argv.define;
    current_project.__current_dir = path.dirname(resolved_path);

    Logger.debug(`${JSON.stringify(project_build_info, null, 2)}`);

    let project = loader.load_project(resolved_path);
    const parent = project_build_info.parent;

    // Calculate unit count for percentage calulcation
    for (const [key, target] of Object.entries(project.targets)) {
        if (target.files && Array.isArray(target.files) && target.files.length >= 1) {
            project_build_info.conf.unit_count += al.Files.resolve_glob(target.files).length;
        }
        else if (target.exec) {
            project_build_info.conf.unit_count++;
        }
    }

    // Libraries
    if (project.libraries) {
        project.__library_links = [];

        if (Array.isArray(project.libraries)) {
            if (project.libraries.length >= 1) {
                project.libraries.forEach(lib_path => {
                    let flask_file = null;

                    const files = fs.readdirSync(lib_path);

                    for (const i in files) {
                        if (path.extname(files[i]) == ".flask") {
                            flask_file = files[i];
                            break;
                        }
                    }

                    Logger.debug(`[${project.name}] flask file for library: ${lib_path} is ${flask_file}, probably.`);

                    const libproj = build_project({
                        cwd: path.resolve(lib_path),
                        argv: project_build_info.argv,
                        parent: project,
                        project_dir: flask_file,
                        conf: project_build_info.conf,
                    });

                    project.__library_links.push(libproj);
                });
            }
        }
        else {
            throw new Error("project.libraries must be an array of strings");
        }
    }

    project_validate_compilers(project);

    let status = true;
    let obj_files = [];
    for (const [i, [key, target]] of Object.entries(project.targets).entries()) {
        target.__project = project;

        // Check if there's configuration filter
        if (target.configuration) {
            if (!target.configuration.includes(project.var("configuration"))) {
                continue;
            }
        }

        // TODO: When processing target, check if the configuration matches here.
        // if (target.configuration matches project.__configuration)

        if (target.files) {
            if (!Array.isArray(target.files)) {
                throw new Error("target.files must be an array of strings or nested array of strings");
            }

            const files = al.Files.resolve_glob(target.files);

            if (files && files.length > 0) {
                // Identify the compiler only when files field is present
                target.__compiler = target_identify_compiler(target);

                for (const i in files) {
                    const f = files[i];

                    const percentage = Math.floor(project_build_info.conf.current_unit_count / project_build_info.conf.unit_count * 100);

                    if (target.name) {
                        Logger.info(`[${percentage}%] ${target.name}: ${kleur.blue("Compiling")} ${target.__compiler.current_lang.name} ${kleur.blue("file")} ${kleur.gray(path.basename(f))}...`);
                    }
                    else {
                        Logger.info(`[${percentage}%] ${key}: ${kelur.blue("Compiling")} ${path.basename(f)}...`);
                    }

                    const result = target.__compiler.compile_file(target, f);
                    if (!result.ok) {
                        Logger.error(`[${percentage}%]` + kleur.red(`Failed to compile ${path.basename(f)}`));
                        Logger.info(kleur.red(`${result.proc.stderr}`));
                        status = false;
                        break;
                    }
                    else {
                        obj_files.push(result.obj);
                    }

                    // Update unit count
                    project_build_info.conf.current_unit_count++;

                }
            }
        }

        const percentage = Math.floor(project_build_info.conf.current_unit_count / project_build_info.conf.unit_count * 100);

        // If target contains an exec field
        if (target.exec) {
            // Increment current unit count for percentage calculation
            project_build_info.conf.current_unit_count++;
            const percentage = Math.floor(project_build_info.conf.current_unit_count / project_build_info.conf.unit_count * 100);

            if (!target.exec.bin) {
                throw new Error("target.exec must contain at least a bin field for the binary path");
            }
            else if (typeof target.exec.bin != "string") {
                throw new Error("target.exec.bin must be a string");
            }

            let args = [ ];
            let cwd = project_build_info.cwd;

            if (target.exec.cwd) {
                if (typeof target.exec.cwd != "string") {
                    throw new Error("target.exec.cwd must be a string");
                }

                cwd = path.resolve(cwd, target.exec.cwd);
            }

            if (target.exec.args) {
                if (Array.isArray(target.exec.args)) {
                    args = args.concat(target.exec.args);
                }
                else {
                    throw new Error("target.exec.args must be an array of string");
                }
            }

            try {
                let properties = { cwd: cwd, encoding: "utf8", stdio: ((target.exec.stdio) ? target.exec.stdio : "inherit") };
                const cproc = proc.spawnSync(target.exec.bin, args, properties);
            }
            catch (ex) {
                // TODO: Error handling here.
            }
        }

        if (!status) {
            Logger.error(`[${percentage}%] ` + kleur.red("Failed to compile target"));
        }

        Logger.info(`[${percentage}%] ` + `${kleur.blue("Built target")} ${(target.name) ? target.name : key}`);
    }

    const percentage = Math.floor(project_build_info.conf.current_unit_count / project_build_info.conf.unit_count * 100);

    // Link "em all
    if (obj_files.length >= 1) {
        Logger.info(`[${percentage}%] ` + kleur.blue(`Linking ${project.type} `) + `${project.configuration.outname}` + kleur.blue(`...`));
        project.__compilers.cc.link_files(project, obj_files);
    }

    if (!status) {
        Logger.info(`[${percentage}%] ` + `${kleur.red("Failed to build")} ${project.name}`);
    }
    else {
        Logger.info(`[${percentage}%] ` + `${kleur.green("Built project")} ${project.name}`);
    }

    return project;
}

function target_identify_compiler(target) {
    // TODO: Few other target checks perhaps?
    if (!target) {
        throw new Error("Invalid target");
    }

    const project = target.__project;
    const files = al.Files.resolve_glob(target.files);
    const ext = path.extname(files[0]).substr(1);

    for (const [_, c] of Object.entries(project.__compilers)) {
        for (const [_, lang] of Object.entries(c.langs)) {
            if (lang.extensions.includes(ext) && c.current_lang == lang) {
                Logger.debug(`Compiler: ${c.name} :: Ext: ${ext}`);
                return c;
            }
        }
    }

    throw new Error("Failed to identify compiler for this target");
}

function get_platform_default_compiler() {
    return al.Compiler.GCC;
}

function project_validate_compilers(project) {
    project.__compilers = {};

    if (project.configuration.cc) {
        // FIXME: This process is GCC/Clang centric, won"t work with MSVC!
        const ccproc = proc.spawnSync(project.configuration.cc, [ "-c", __dirname + "/identify.c", "-o", "/tmp/identify.out" ], { encoding: "utf8" });
        const stdoerr = ccproc.stdout + ccproc.stderr;

        if (ccproc.status != 0) {
            throw new Error(`${project.configuration.cc} couldn"t compile a basic C code`);
        }
        else {
            if (stdoerr.indexOf("__flask_compiler_gnu") !== -1) {
                project.__compilers.cc = Object.assign({}, al.Compiler.GCC);
                project.__compilers.cc.current_lang = al.Languages.C;
                Logger.debug("Compiler is GCC");
            }
            else if (stdoerr.indexOf("__flask_compiler_clang") !== -1) {
                //project.__compilers.cc = al.Compiler.Clang;
                //project.__compilers.cc.current_lang = al.Languages.C;
                Logger.debug("Compiler is Clang");
            }
            else if (stdoerr.indexOf("__flask_compiler_cl") !== -1) {
                //project.__compilers.cc = al.Compiler.MSVC;
                //project.__compilers.cc.current_lang = al.Languages.C;
                Logger.debug("Compiler is CL");
            }
            else {
                // Should never occur as compilation of identify.c would fail first.
            }

            project.__compilers.cc.bin = project.configuration.cc;
        }
    }

    if (project.configuration.cxx) {
        // FIXME: This process is GCC/Clang centric, won"t work with MSVC!
        const ccproc = proc.spawnSync(project.configuration.cxx, [ "-x", "c++", "-c", __dirname + "/identify.c", "-o", "/tmp/identify.out" ], { encoding: "utf8" });
        const stdoerr = ccproc.stdout + ccproc.stderr;

        if (ccproc.status != 0) {
            throw new Error(`${project.configuration.cxx} couldn"t compile a basic C++ code`);
        }
        else {
            if (stdoerr.indexOf("__flask_compiler_gnu") !== -1) {
                project.__compilers.cxx = Object.assign({}, al.Compiler.GCC);
                project.__compilers.cxx.current_lang = al.Languages.CXX;
                Logger.debug("Compiler is GCC");
            }
            else if (stdoerr.indexOf("__flask_compiler_clang") !== -1) {
                //project.__compilers.cxx = Object.assign({}, al.Compiler.Clang);
                //project.__compilers.cxx.current_lang = al.Languages.CXX;
                Logger.debug("Compiler is Clang");
            }
            else if (stdoerr.indexOf("__flask_compiler_cl") !== -1) {
                //project.__compilers.cxx = Object.assign({}, al.Compiler.MSVC);
                //project.__compilers.cxx.current_lang = al.Languages.CXX;
                Logger.debug("Compiler is CL");
            }
            else {
                // Should never occur as compilation of identify.cxx would fail first.
            }

            project.__compilers.cxx.bin = project.configuration.cxx;
        }
    }

    if (project.configuration.asm) {
        // TODO: Implement for each architecture n stuff.
        // For now:
        project.__compilers.asm = Object.assign({}, al.Compiler.GCC);
        project.__compilers.asm.bin = project.configuration.asm;
        project.__compilers.asm.current_lang = al.Languages.ASM;
    }
}

module.exports = [
];
