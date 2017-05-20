/**
 * @lib ProxyServer Прокси-сервер доменов участников
 * @arg --port {80!} Порт
 */

var argv = require('minimist')(process.argv)
var http = require('http')
var proxy = require('http-proxy').createProxyServer()
var conf = require('./conf.js')

if (!argv.port) argv.port = '80'

http.createServer(function (request, response) {
    var protocol = request.connection.encrypted ? 'https' : 'http'
    var domain = request.headers.host.replace(conf.deploy.host, '').slice(0, -1)

    if (domain !== '') {
        if (conf.user[domain] !== undefined) {
            proxy.web(request, response, {
                target: `${protocol}://${conf.deploy.host}:${conf.user[domain].port}`
            })
        } else {
            response.end('Unknown user')
        }
    } else {
        response.end('Empty user domain')
    }
})
.listen(argv.port)

console.log(`Domain server is running on http://localhost:${argv.port}`)