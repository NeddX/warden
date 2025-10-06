const { Compiler, Languages } = require("../alchemical");

const path = require("path");
const proc = require("node:child_process");

Compiler.GCC = {
    name: "GNU Compiler Collection",
    bin: "gcc",
    langs: [ Languages.C, Languages.CXX, Languages.ASM ],
    current_lang: Languages.C,

    link_files: function (project, files) {
        const outfile = `${project.configuration.outdir}/${project.configuration.outname}`;

        let flags = [
        ];

        if (project.configuration.linkfile) {
            flags = flags.concat(["-T", project.configuration.linkfile]);
        }

        files.forEach(f => {
            flags.push(f);
        });

        flags = flags.concat(["-o", outfile]);

        // Append LDFLAGS
        if (project.configuration.ldflags) {
            project.configuration.ldflags.split(" ").forEach(f => {
                flags.push(f);
            });
        }

        // Do we have any dependencies to link?
        if (project.__library_links) {
            project.__library_links.forEach(libproj => {
                if (!flags.includes(`-L${libproj.configuration.outdir}`)) {
                    flags.push(`-L${path.resolve(path.resolve(libproj.__current_dir, libproj.configuration.outdir))}`);
                }

                // When using -l, we don"t want the extension
                let frlibname = libproj.configuration.outname;
                if (frlibname.startsWith("lib")) {
                    frlibname = frlibname.substring(3);
                }
                flags.push(`-l${path.basename(frlibname, path.extname(frlibname))}`);
            });
        }

        //console.log(flags);

        const ccproc = proc.spawnSync(this.bin, flags, { encoding: "utf8" });
        process.stdout.write(ccproc.stdout);
        process.stderr.write(ccproc.stderr);
    },
    compile_file: function (target, file) {
        // TODO: C++ Support?
        const f_wo_ext = path.basename(file, path.extname(file));
        const project = target.__project;
        const obj_file = `${project.configuration.builddir}/${f_wo_ext}.o`;

        const flags = [
            "-c", file,
            "-o", obj_file,
        ];

        if (this.current_lang == Languages.CXX) {
            flags = [ "-x", "c++" ].concat(flags);

            if (project.configuration.cxxstd == Languages.CXX.StdCXX98) {
                flags.push((project.configuration.gnudialect) ? "-std=gnu++98" : "-std=c++98");
            }
            else if (project.configuration.cxxstd == Languages.CXX.StdCXX11) {
                flags.push((project.configuration.gnudialect) ? "-std=gnu++11" : "-std=c++11");
            }
            else if (project.configuration.cxxstd == Languages.CXX.StdCXX14) {
                flags.push((project.configuration.gnudialect) ? "-std=gnu++14" : "-std=c++14");
            }
            else if (project.configuration.cxxstd == Languages.CXX.StdCXX17) {
                flags.push((project.configuration.gnudialect) ? "-std=gnu++17" : "-std=c++17");
            }
            else if (project.configuration.cxxstd == Languages.CXX.StdCXX20) {
                flags.push((project.configuration.gnudialect) ? "-std=gnu++20" : "-std=c++20");
            }
            else if (project.configuration.cxxstd == Languages.CXX.StdCXX23) {
                flags.push((project.configuration.gnudialect) ? "-std=gnu++23" : "-std=c++23");
            }
        }
        else {
            if (project.configuration.cstd == Languages.C.StdC89) {
                flags.push((project.configuration.gnudialect) ? "-std=gnu98" : "-std=c98");
            }
            else if (project.configuration.cstd == Languages.C.StdC99) {
                flags.push((project.configuration.gnudialect) ? "-std=gnu99" : "-std=c99");
            }
            else if (project.configuration.cstd == Languages.C.StdC11) {
                flags.push((project.configuration.gnudialect) ? "-std=gnu11" : "-std=c11");
            }
            else if (project.configuration.cstd == Languages.C.StdC17) {
                flags.push((project.configuration.gnudialect) ? "-std=gnu17" : "-std=c17");
            }
            else if (project.configuration.cstd == Languages.C.StdC23) {
                flags.push((project.configuration.gnudialect) ? "-std=gnu23" : "-std=c23");
            }
        }

        // TODO: Throw error when project.defines is not an array
        if (project.defines && Array.isArray(project.defines) && project.defines.length >= 1) {
            for (const i in project.defines) {
                const define = project.defines[i];

                if (Array.isArray(define)) {
                    flags.push(`-D${define[0]}`);

                    if (flags.length >= 1) {
                        flags[flags.length - 1] += `=${define[1]}`;
                    }
                }
                else {
                    flags.push(`-D${define}`);
                }
            }
        }

        // TODO: Throw error when project.defines is not an array
        if (project.includes && Array.isArray(project.includes) && project.includes.length >= 1) {
            for (const i in project.includes) {
                const include_dir = project.includes[i];

                // TODO: Check if this path even exists or not?
                flags.push(`-I${include_dir}`);
            }
        }

        // Append CFLAGS
        if (project.configuration.cflags) {
            project.configuration.cflags.split(" ").forEach(f => {
                flags.push(f);
            });
        }

        //console.log(flags);

        const cproc = proc.spawnSync(this.bin, flags, { encoding: "utf8" });

        return {
            ok: cproc.status == 0,
            proc: cproc,
            obj: obj_file,
            lang: this.current_lang,
        };
    },
};
