const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");

const lg = require("./logger");

const FlaskDefines = {
    DEFAULT_EXTENSION: "flask",
    get DEFAULT_PROJECT_FILE_NAME() {
        return `project.${this.DEFAULT_EXTENSION}`;
    },
};

let Languages = {};
let Compiler = {};
let ProjectType = {
    StaticLib: "static library",
    Exec: "executable",
    SharedLib: "shared library",
};

const SampleProjectTemplate = {
    __argv: {},
    __current_dir: "",
    __configuration: "debug",

    name: "default-flask-project",
    languages: [ Languages.C ],
    type: ProjectType.Executable,
    version: [ 1, 0, 0 ],
    build_count: 0,
    configuration: { },

    print: function (level_or_msg, msg) {
        if (!msg || level_or_msg == lg.LEVEL_INFO) {
            process.stdout.write(level_or_msg + "\n\r");
        }
        else {
            if (level_or_msg == lg.LEVEL_DEBUG) {
                if (this.__configuration == "debug") {
                // TODO: Green?
                    process.stdout.write(`${level_or_msg} ${msg}\n\r`);
                }
            }
            else if (level_or_msg == lg.LEVEL_ERROR || level_or_msg == lg.LEVEL_FATAL) {
                // TODO: Red?
                process.stderr.write(`${level_or_msg} ${msg}\n\r`);
            }
            else if (level_or_msg == lg.LEVEL_WARN) {
                // TODO: Yellow?
                process.stdout.write(`${level_or_msg} ${msg}\n\r`);
            }
        }
    },
    var: function (varname) {
        return (this.__argv[varname] == undefined) ? "" : this.__argv[varname];
    },
    env: function (envarname) {
        return process.env[envarname] || "";
    },
    current_dir: function() {
        return this.__current_dir;
    },
    define_symbol: function (symbol) {
        // Define symbol for all targets
    },
    define_symbols: function (symbols) {
        // Define symbols for all targets
    },
};

const Flask = {
    __projects: [],
    __current_project: null,
    __argv: {},

    // Private functions
    __init: function () {
        this.__current_project = Object.assign({}, SampleProjectTemplate);
    },

    // Functions
    add_project: function (project) {
        if (project) {
            for (const e in this.__projects) {
                if (e.name == project.name) {
                    throw new Error(`Project ${e.name} was already added`);
                }
            }

            // Copy the object
            for (const k in project) {
                this.__current_project[k] = project[k];
            }

            // TODO: Based on platform, project type, etc. select output binary extension (.so, .o, .lib, .exe)
            this.__current_project.configuration = {
                builddir: "./build",
                outdir: "./build/bin",
                outname: `${this.__current_project.name}`,
            };

            // Assign a default version if not assigned
            if (!this.__current_project.version) {
                this.__current_project.version = [ 1, 0, 0 ];
            }

            // Default configuration to debug if not specified
            if (!this.__current_project.__argv["config"] && !this.__current_project.__argv["configuration"]) {
                this.__current_project.__argv["configuration"] = "debug";
                this.__current_project.__argv["config"] = this.__current_project.__argv["configuration"];
            }
            // Otherwise if define config if configuration is defined and vice-versa
            else if (!this.__current_project.__argv["config"] && this.__current_project.__argv["configuration"]) {
                this.__current_project.__argv["config"] = this.__current_project.__argv["configuration"];
            }
            else if (this.__current_project.__argv["config"] && !this.__current_project.__argv["configuration"]) {
                this.__current_project.__argv["configuration"] = this.__current_project.__argv["config"];
            }

            this.__projects.push(this.__current_project);
        }
        else {
            throw new Error("Cannot add a null project");
        }

        return this.__current_project;
    },
};

const Files = {
    glob: function (glob) {
        return fg.sync(glob, { absolute: true });
    },
    resolve_glob: function (files) {
        let arr = [];

        files.forEach(f => {
            if (Array.isArray(f)) {
                f.forEach(x => { arr.push(x); });
            }
            else {
                arr.push(f);
            }
        });

        return arr;
    },
};

module.exports = {
    Flask,
    Files,
    FlaskDefines,
    ProjectType,
    Compiler,
    Languages,
};
