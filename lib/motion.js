/**
 * @lib Motion Работа с анимациями
 * @ver 0.1.0
 * @url github.yandex-team.ru/kovchiy/motion
 */

var Motion = {}

;(function () {

var requestAnimationFrame = (
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame
)

/**
 * http://gizma.com/easing/
 * t - current time, b - start value, c - change in value, d - duration
 * Easings in, out and inOut are cubic here
 */
var ease = {
    linear: function (t, b, c, d) {
        return c*t/d + b
    },
    in: function (t, b, c, d) {
        t /= d
        return c*t*t*t + b
    },
    out: function (t, b, c, d) {
        t /= d
        t--
        return c*(t*t*t + 1) + b
    },
    inOut: function (t, b, c, d) {
        t /= d/2
        if (t < 1) return c/2*t*t*t + b
        t -= 2
        return c/2*(t*t*t + 2) + b
    }
}

/**
 * @options {
 *     from: number,
 *     to: number,
 *     duration: number,
 *     ease: string,
 *     delay: number,
 *     onChange: function (value),
 *     onFinish: function
 * }
 */
Motion.transition = function (options) {
    var value
    var time
    var startTime
    var timestamp
    var diff = Math.abs(options.from - options.to)

    var move = function () {
        timestamp = new Date()
        if (!startTime) startTime = timestamp
        time = timestamp - startTime
        value = ease[options.ease](time, 0, diff, options.duration)

        options.onChange(
            options.from < options.to
                ? options.from + value
                : options.from - value
        )

        if (time <= options.duration) {
            requestAnimationFrame(move)
        } else {
            options.onFinish && options.onFinish()
        }
    }

    if (options.delay) {
        setTimeout(move, options.delay)
    } else {
        move()
    }
}

})();