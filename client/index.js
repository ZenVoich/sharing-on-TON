import {Client} from './client.js';
import {initUI} from './ui.js';
import {initWS} from './ws.js';

let client = new Client;
initWS(client);
initUI(client);