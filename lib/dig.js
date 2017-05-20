/**
 * @lib Dig Безопасная работа с json
 * @ver 0.2.2
 * @url github.yandex-team.ru/kovchiy/dig
 */

'use strict';

var Dig

;(function () {

var regExpComma = /,\s?/
var regExpEqual = /\s?=\s?/
var regExpOr = /\s?\|\s?/

/**
 * Core method
 *
 * @content  object   Pointer to start with
 * @path     string   Extraction path in formats:
 *                    - field1.field2
 *                    - field1.field2[].field3[0]
 *                    - field1.field2[].field3[0].field4(requiredField1, requiredField2[0])
 *                    - field1.field2 = x
 *                    - field1.field2(requiredField1 = x)
 *                    - field1.field2 | field1.field3
 * @callback function Applied to extracted data: callback.call(finalContext, finalContext, i)
 * @return   boolean  If every extraction was success
 */
function dig (context, path, callback, requiredFields, condition) {
    if (typeof context === 'undefined' || context === null || path === '') return false

    // x | y
    if (path.search(regExpOr) > -1) {
        var paths = path.split(regExpOr)
        for (var i = 0, ii = paths.length; i < ii; i++) {
            if (dig(context, paths[i], callback)) return true
        }

        return false
    }

    // x(y)
    var indexOfOpenBracket = path.indexOf('(')
    if (indexOfOpenBracket > -1) {
        requiredFields = path.substring(indexOfOpenBracket+1, path.length-1).split(regExpComma)
        path = path.substring(0, indexOfOpenBracket)
    }

    // x = y
    if (typeof condition === 'undefined') {
        if (path.search(regExpEqual) > -1) {
            var equalExp = path.split(regExpEqual)
            path = equalExp[0]
            condition = {
                type: '=',
                value: equalExp[1]
            }
        }
    }

    // x.y.z
    var dotIndex = path.indexOf('.')
    var pathItem

    while (path !== '') {
        if (dotIndex !== -1) {
            pathItem = path.substr(0, dotIndex)
            path = path.substr(dotIndex + 1)
            dotIndex = path.indexOf('.')
        } else {
            pathItem = path
            path = ''
        }

        if (pathItem !== '' && (typeof context !== 'object' || context === null)) {
            return false
        } else if (pathItem.indexOf('[') > -1) {
            return digArray(context, pathItem, path, callback, requiredFields, condition)
        } else if (typeof context[pathItem] === 'undefined') {
            return false
        } else {
            context = context[pathItem]
        }
    }

    if (checkCondition(context, condition) && hasPath(context, requiredFields)) {
        var callbackResult
        if (callback) {
            callbackResult = callback.call(context, context)
        }

        return typeof callbackResult !== 'undefined' ? callbackResult : true
    }

    return false
}

function digArray (context, pathItem, path, callback, requiredFields, condition) {
    var arrayItem
    var specificIndex
    var indexOfOpenBracket = pathItem.indexOf('[')

    if (pathItem[indexOfOpenBracket + 1] !== ']') {
        specificIndex = pathItem.substring(
            indexOfOpenBracket + 1,
            pathItem.indexOf(']')
        )
    }

    pathItem = pathItem.substring(0, indexOfOpenBracket)

    if (Array.isArray(context[pathItem])) {
        if (typeof specificIndex !== 'undefined') {
            arrayItem = context[pathItem][specificIndex]
            if (typeof arrayItem !== 'undefined') {
                if (path === '' && hasPath(arrayItem, requiredFields) && checkCondition(arrayItem, condition)) {
                    var callbackResult
                    if (callback) {
                        callbackResult = callback.call(arrayItem, arrayItem)
                    }
                    return typeof callbackResult !== 'undefined' ? callbackResult : true
                } else {
                    return dig(arrayItem, path, callback, requiredFields, condition)
                }
            } else {
                return false
            }
        } else {
            var failOnce = false
            var fail = false
            var ctx
            var callbackResults

            for (var i = 0, ii = context[pathItem].length; i < ii; i++) {
                ctx = context[pathItem][i]

                if (path === '' && hasPath(ctx, requiredFields) && checkCondition(ctx, condition)) {
                    if (callback) {
                        var callbackResult = callback.call(ctx, ctx, i)
                        if (typeof callbackResult !== 'undefined') {
                            if (typeof callbackResults === 'undefined') {
                                callbackResults = []
                            }
                            callbackResults.push(callbackResult)
                        }
                    }
                } else {
                    var digResult = dig(ctx, path, callback, requiredFields, condition)
                    if (digResult && digResult !== true) {
                        if (typeof callbackResults === 'undefined') {
                            callbackResults = []
                        }
                        callbackResults.push(digResult)
                    }

                    fail = digResult ? false : true
                }

                if (fail && !failOnce) {
                    failOnce = true
                }
            }

            return typeof callbackResults !== 'undefined' ? callbackResults : !failOnce
        }
    } else {
        return false
    }
}

function hasPath (context, requiredFields) {
    if (typeof requiredFields === 'undefined') return true

    for (var i = 0, ii = requiredFields.length; i < ii; i++) {
        if (!dig(context, requiredFields[i])) return false
    }

    return true
}

function checkCondition (context, condition) {
    if (typeof condition === 'undefined') return true

    if (condition.type === '=' && condition.value === context) {
        return true
    }

    return false
}

Dig = dig

})();

if (typeof module !== 'undefined') {
    module.exports = Dig
}
