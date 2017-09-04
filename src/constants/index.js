/*global console*/
export const COMPONENT_REQUEST_URL = 'http://localhost:3000/r/index.html?module=';
export const STATIC_REQUEST_URL = 'http://localhost:3000/';
export const MENU_URL = 'http://localhost:3000/menu.json';
export const RECEIVE_ACCOUNT = 'RECEIVE_ACCOUNT';
// export const API_SERVER = 'http://192.168.50.151:8080/fw/json/mdl';
export const API_SERVER = 'http://192.168.50.151:61324';

export const C = (funcName, a) => {
    /* eslint-disable no-console */
    if (a) {
        console.log(`${funcName}:`, a);
    } else {
        console.log(funcName);
    }

    // Номер строки. В данном  варианте бесполезно, т.к. возвращает номер строки бандла. Потом ещё подумать.
    // try { throw new Error(); }
    // catch (err) {
    //     console.log(err.stack.split('\n')[2].match(/at\s+([^\s]+)\s+\((.+):(\d+):/));
    // }

    /* eslint-enable no-console */
};


export const CREATE_API_URL = ({ moduleId, command, query }) => {
    let queryString = Object.keys(query).reduce((r, k) => `${r}&${k}=${query[k]}`, '');

    return `${API_SERVER}/${command}/${moduleId}/?${queryString}`;
};