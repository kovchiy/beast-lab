/**
 * @lib Ajax Асинхронные клиентские запросы
 * @ver 0.1.0
 * @arg {object} options {url:string, data:object, success:function, error:function, jsonp:boolean|string}
 */
function Ajax (options) {
    var qs = ''
    if (options.data) {
        for (var key in options.data) {
            qs += '&'+ key +'='+ encodeURIComponent(options.data[key])
        }
        qs = qs.substr(1)
    }

    if (options.jsonp) {
        var callbackName = typeof options.jsonp === 'string'
            ?  options.jsonp
            : 'jsonp_callback_' + Math.random().toString().substr(2)

        window[callbackName] = function (data) {
            delete window[callbackName]
            document.head.removeChild(script)
            options.success(data)
        }

        var script = document.createElement('script')
        script.src = options.url + '?' + qs + '&callback=' + callbackName
        script.onerror = options.error
        document.head.appendChild(script)
    } else {
        try {
            var xhr = new (XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0')
            xhr.open('GET', options.url + (qs !== '' ? '?' + qs : ''), 1)
            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
            xhr.onreadystatechange = function () {
                if (xhr.readyState > 3) {
                    if (xhr.status === 200) {
                        options.success && options.success(xhr.responseText, xhr)
                    } else {
                        options.error && options.error(xhr.responseText, xhr)
                    }
                }
            }
            xhr.send()
        } catch (e) {
            window.console && console.log(e)
        }
    }
}
