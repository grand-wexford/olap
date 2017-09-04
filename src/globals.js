/*global console, */
export function c(funcName, a) {
    let message;
    /* eslint-disable no-console */
    funcName += a ? ': ' : '';
    a = a || '';

    if (typeof a === 'string') {
        message = a;
    } else {
        message = Array.prototype.map.call(a, function (elem) {
            return elem;
        }).join(", ");
    }

    console.log(`${funcName} ${message}`);
    return true;

    /* eslint-enable no-console */
}