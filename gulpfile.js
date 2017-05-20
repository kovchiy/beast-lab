// node_modules requires
var gulp = require('gulp')
var concat = require('gulp-concat')
var less = require('gulp-less')
var stylus = require('gulp-stylus')
var base64 = require('gulp-base64')
var base64Settings = {
    extensions: ['svg'],
    maxImageSize: 10 * 1024,
    debug: false
}
var autoprefixer = require('gulp-autoprefixer')
var autoprefixerSettings = {
    browsers: ['iOS >= 7'],
    cascade: false
}
var through = require('through2')
var fs = require('fs')
var http = require('http')
var spawn = require('child_process').spawn
var spawnSync = require('child_process').spawnSync
var execSync = require('child_process').execSync
var argv = require('minimist')(process.argv)
var ssh2 = require('ssh2')

// lib requires
var beast = require('./lib/beast.js')
var beastDoc = require('./lib/beast-doc.js')
var conf = require('./lib/conf.js')

// Заготовка для gulp-плагина
function pipeToString (callback, ext) {
    return through.obj(function(file, encoding, cb) {
        if (file.isNull()) return cb(null, file)
        if (file.isStream()) return cb(new PluginError('gulp-beast', 'Streaming not supported'))
        if (ext === undefined || file.path.split('.').pop() === ext) {
            file.contents = new Buffer(
                callback(file.contents.toString(), file)
            )
        }
        cb (null, file)
    })
}

function sshExec (conn, cmd, cb) {
    conn.exec(cmd, (err, stream) => {
        var streamOut = ''
        var streamError = ''

        stream
            .on('close', (code) => {
                cb(code, streamOut, streamError)
            })
            .on('data', (data) => {
                streamOut += data.toString()
            })

        stream.stderr.on('data', (data) => {
            streamError += data.toString()
        })

        stream.stdout.on('data', (data) => {
            if (data.toString().indexOf('Enter file') !== -1) {
                stream.stdin.end('\n')
            }
        })
    })
}

if (conf.user[conf.username] === undefined) {
    console.log(`Please, add user '${conf.username}' to 'lib/conf.js'`)
    process.exit(1)
}

if (!fs.existsSync('./build')) {
    fs.mkdirSync('./build')
}
if (!fs.existsSync('./build/blocks')) {
    fs.mkdirSync('./build/blocks')
}

gulp.task('js', ['js-lib'], () => {
    return gulp.src(conf.path.js)
        .pipe(pipeToString(
            (string, file) => {
                var filename = file.path.split('/').pop().split('.')[0] + '.js'
                var filepath = './build/blocks/' + filename.toLowerCase()
                var stringJS = beast.parseBML(string)

                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath)
                }
                fs.appendFileSync(filepath, stringJS)
                return stringJS
            },
            'bml'
        ))
        .pipe(concat('build.js'))
        .pipe(gulp.dest('./build'))
})

gulp.task('exp', () => {
    var expNames = []

    // Получить полный список названий экспериментов
    for (var i = 0, ii = conf.path.exp.length; i < ii; i++) {
        if (fs.existsSync(conf.path.exp[i])) {
            expNames = expNames.concat(
                fs.readdirSync(conf.path.exp[i])
            )
        }
    }

    // Сборка для каждого эксперимента
    for (var i = 0, ii = expNames.length; i < ii; i++) {
        var expName = expNames[i]
        var js = []
        var css = []

        for (var j = 0, jj = conf.path.exp.length; j < jj; j++) {
            js.push(
                `${conf.path.exp[j]}/${expName}/**/*.bml`
            )
            css.push(
                `${conf.path.exp[j]}/${expName}/**/*.styl`
            )
        }

        fs.writeFileSync(`./build/exp/${expName}.js`, '')
        fs.writeFileSync(`./build/exp/${expName}.css`, '')

        gulp.task('exp-js', () => {
            gulp.src(js)
                .pipe(pipeToString(string => beast.parseBML(string), 'bml'))
                .pipe(concat(`${expName}.js`))
                .pipe(gulp.dest('./build/exp'))
        })

        gulp.task('exp-css', () => {
            gulp.src(css)
                .pipe(base64(base64Settings))
                .pipe(concat(`${expName}.styl`))
                .pipe(stylus())
                .pipe(autoprefixer(autoprefixerSettings))
                .pipe(gulp.dest('./build/exp'))
        })

        gulp.watch(js, ['exp-js'])
        gulp.watch(css, ['exp-css'])
        gulp.start('exp-js', 'exp-css')
    }
})

gulp.task('js-lib', () => {
    return gulp.src(conf.path.lib)
        .pipe(concat('lib.js'))
        .pipe(gulp.dest('./build'))
})

gulp.task('css', () => {
    var filenames = []
    var splitString = '\n/* CUT THE FILE HERE */\n'

    return gulp.src(conf.path.css)
        .pipe(pipeToString(
            (string, file) => {
                var filename = (file.path.split('/').pop().split('.')[0] + '.css').toLowerCase()
                filenames.push(filename)
                return string
            }
        ))
        .pipe(base64(base64Settings))
        .pipe(concat('build.styl', {newLine: splitString}))
        .pipe(stylus())
        .pipe(autoprefixer(autoprefixerSettings))
        .pipe(gulp.dest('./build'))
        .pipe(pipeToString(
            (string, file) => {
                string.split(splitString).forEach((text, i) => {
                    var filename = './build/blocks/' + filenames[i]
                    if (fs.existsSync(filename)) {
                        fs.unlinkSync(filename)
                    }
                    fs.appendFileSync(filename, text)
                })
                return string
            }
        ))
})

var doc = {}
var gitLogCommands, gitLogBlocks

gulp.task('doc', ['doc-parse'], function (done) {

    beastDoc.compileDoc(doc)

    var lastCommit = execSync(gitLogCommands).toString().split('\n')
    gitLogBlocks.forEach((block, i) => {
        if (doc.blocks[block] !== undefined) {
            var commit = lastCommit[i].split(' ')
            doc.blocks[block].lastCommitDate = parseInt(commit[0]) * 1000
            doc.blocks[block].lastCommitHref = `https://${conf.repoHost}/${conf.repoName}/commit/${commit[1]}`
        }
    })

    fs.writeFileSync(
        './build/doc-module.js', `module.exports = ${JSON.stringify(doc)}`
    )
    fs.writeFileSync(
        './build/doc.js', `BeastDoc(${JSON.stringify(doc)})`
    )
    done()
})

gulp.task('doc-parse', () => {
    gitLogCommands = ''
    gitLogBlocks = []
    doc = {}

    return gulp
        .src(conf.path.blocks.concat(conf.path.lib))
        .pipe(pipeToString(
            (string, file) => {
                var fileDoc = beastDoc.parseDoc(string)
                var blockPath = file.path.replace(/\/[^\/]+$/,'')
                var blockName = blockPath.split('/').pop().toLowerCase()

                gitLogCommands += `git log -1 --format="%ct %h" ${blockPath};\n`
                gitLogBlocks.push(blockName)

                beastDoc.extendDoc(doc, fileDoc)

                return string
            }
        ))
})

var server
gulp.task('server', ['build'], () => {
    server && server.kill()
    server = spawn('node', ['lib/server-project.js', '--port', conf.port.dev, '--dev', '--user', conf.username])

    server.stdout.on('data', (data) => {
        console.log(data.toString())
    })
    server.stderr.on('data', (data) => {
        console.log(data.toString())
        server.kill()
    })
    server.on('error', (data) => {
        console.log(data.toString())
        server.kill()
    })
    process.on('exit', (code) => {
        server.kill()
    })
})

gulp.task('build', ['js', 'css', 'doc']) // TODO: вернуть 'exp'

gulp.task('default', () => {
    gulp.watch(conf.path.js, ['js'])
    gulp.watch(conf.path.css, ['css'])
    gulp.watch(conf.path.blocks, ['doc'])
    gulp.start('server')
})

gulp.task('deploy', (done) => {

    var conn = new ssh2.Client()

    conn.on('ready', () => {
            console.log('[DEPLOY]', `Connected to ${conf.deploy.host}`)
            auth()
        })
        .on('error', (err) => {
            console.log('[DEPLOY]', err)
            conn.end()
        })
        .connect({
            host: conf.deploy.host,
            username: conf.username,
            privateKey: fs.readFileSync(`/Users/${conf.username}/.ssh/id_rsa`).toString(),
            keepaliveInterval: 100
        })

    function auth () {
        console.log('[DEPLOY]', 'Check authorisation...')

        sshExec(conn, `test -e /home/${conf.username}/.ssh/known_hosts`, code => {
            if (code === 0) {
                // If known_hosts exists
                checkGitAccess()
            } else {
                sshExec(
                    conn,
                    `ssh-keyscan -H ${conf.repoHost} >> /home/${conf.username}/.ssh/known_hosts`,
                    checkGitAccess
                )
            }
        })
    }

    function checkGitAccess () {
        sshExec(conn, `ssh -T ${conf.repoHost}`, (code, out, err) => {
            if (code === 1) {
                console.log('[DEPLOY]', 'Permission OK')
                deploy()
            } else {
                console.log('[DEPLOY]', 'Permission denied')
                sshExec(conn, `test -e /home/${conf.username}/.ssh/id_rsa.pub`, code => {
                    if (code === 0) {
                        // If id_rsa.pub exists
                        // outputKey()
                        deploy()
                    } else {
                        keygen()
                    }
                })
            }
        })
    }

    function keygen () {
        console.log('[DEPLOY]', 'SSH key generation...')
        sshExec(
            conn,
            [
                `cd /home/${conf.username}/.ssh`,
                `ssh-keygen`,
            ].join(';'),
            (code, out, err) => {
                if (code === 0) {
                    outputKey()
                } else {
                    console.log('[DEPLOY]', `Error while SSH key generation. Sorry.`)
                    conn.end()
                }
            }
        )
    }

    function outputKey () {
        sshExec(conn, `cat /home/${conf.username}/.ssh/id_rsa.pub`, (code, out, err) => {
            console.log(
                '[DEPLOY]',
                `Add this key to git repo deploy keys (or send to @kovchiy), then deploy again. Copy and paste this:`,
                `\n\x1b[7m${out}\x1b[0m`
            )
            conn.end()
        })
    }

    function deploy () {
        console.log('[DEPLOY]', 'Deploy started...')
        sshExec(conn, `cd ${conf.deploy.baseDir}`, (code) => {
            if (code === 0) {
                restart()
            } else if (code === 1) {
                init()
            } else {
                throw 'Unknown error'
            }
        })
    }

    function init () {
        console.log('[DEPLOY]', 'Init git repo...')
        sshExec(
            conn,
            [
                `git clone ${conf.repo} ${conf.deploy.baseDir}`,
                `cd ${conf.deploy.baseDir}`,
                `git fetch --all`,
                `cd ../`,
            ].join(';'),
            (code, out, err) => {
                if (code === 0) {
                    console.log('[DEPLOY]', 'Git repo inited')
                    restart()
                } else {
                    console.log('[DEPLOY]', err)
                    conn.end()
                }
            }
        )
    }

    function restart () {
        console.log('[DEPLOY]', 'Update and restart...')
        sshExec(
            conn,
            [
                `cd ${conf.deploy.baseDir}`,
                `git checkout ${conf.username}`,
                `git pull origin ${conf.username}`,
                `npm install`,
                `gulp build`,
                `forever stop lib/server-project.js`,
                `forever start lib/server-project.js --port ${conf.user[conf.username].port}`,
            ].join(';'),
            (code, out, err) => {
                if (code === 0) {
                    console.log(
                        '[DEPLOY]',
                        'Deploy finished. Check links:',
                        `\nhttp://${conf.deploy.host}:${conf.user[conf.username].port}`,
                        `\nhttp://${conf.username}.${conf.deploy.host}`
                    )
                } else {
                    console.log('[DEPLOY]', err)
                }
                conn.end()
            }
        )
    }
})

gulp.task('restart-proxy', () => {
    var conn = new ssh2.Client()

    conn.on('ready', () => {
            console.log('[RESTART PROXY]', `Connected to ${conf.deploy.host}`)
            sshExec(
                conn,
                [
                    `cd ${conf.deploy.baseDir}; sudo forever stop lib/server-proxy.js`,
                    `cd ${conf.deploy.baseDir}; sudo forever start lib/server-proxy.js`
                ].join(';'),
                (code, out, err) => {
                    if (code === 0) {
                        console.log('[RESTART PROXY]', `Finished`)
                    } else {
                        console.log('[RESTART PROXY]', `ERROR:`, err)
                    }

                    conn.end()
                }
            )
        })
        .connect({
            host: conf.deploy.host,
            username: conf.username,
            privateKey: fs.readFileSync(`/Users/${conf.username}/.ssh/id_rsa`).toString()
        })
})
