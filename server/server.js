import {WebSocketServer} from 'ws';
import TonWeb from 'tonweb';
import {Sharing} from './sharing.js';
// const TonWeb = require("tonweb");

const BN = TonWeb.utils.BN;
const toNano = TonWeb.utils.toNano;

const providerUrl = 'https://testnet.toncenter.com/api/v2/jsonRPC'; // TON HTTP API url. Use this url for testnet
const apiKey = 'f089bfd4c3bf8c0e09658224622262223ec9a81683b13e08d9cf23fe546e54e5'; // Obtain your API key in https://t.me/tontestnetapibot
const tonweb = new TonWeb(new TonWeb.HttpProvider(providerUrl, {apiKey})); // Initialize TON SDK

const seed = TonWeb.utils.base64ToBytes('VVdh9U35EHUE5uSFBfpiI6IjKiI9s5mSnBWI4l9EuFc='); // B's private (secret) key
const keyPair = tonweb.utils.keyPairFromSeed(seed); // Obtain key pair (public key and private key)
const wallet = tonweb.wallet.create({
	publicKey: keyPair.publicKey
});

const wss = new WebSocketServer({port: 8080});

// msg {type: requestInit | init | ready | newState | closeChannel | info | startDriving}

let sharing = new Sharing;
let states = new Map; // hisPublicKey => state
let channels = new Map; // hisPublicKey => channel

let minUserInitBalance = toNano('0.2');
let maxUserInitBalance = toNano('2');

let serializeState = (state) => {
	return {
		balanceA: state.balanceA.toString(),
		balanceB: state.balanceB.toString(),
		seqnoA: state.seqnoA.toString(),
		seqnoB: state.seqnoB.toString(),
	};
}

let deserializeState = (state) => {
	return {
		balanceA: new BN(state.balanceA),
		balanceB: new BN(state.balanceB),
		seqnoA: new BN(state.seqnoA),
		seqnoB: new BN(state.seqnoB),
	};
}

wss.on('connection', (ws) => {
	ws.on('message', async (rawData) => {
		try {
			let msg = JSON.parse(rawData.toString());
			console.log('received:', msg);

			// user requests channel initialization
			// data: {userAddress, initUserBalance: nano, userPublicKey}
			if (msg.type === 'requestInit') {
				// state
				let state = {
					balanceA: new BN(msg.data.initUserBalance), // user balance
					balanceB: toNano('0'), // our balance
					seqnoA: new BN(0), // initially 0
					seqnoB: new BN(0),  // initially 0
				};

				states.set(msg.data.userPublicKey.toString(), state);

				// channel
				let channelConfig = {
					// channelId: new BN(Math.random() * 1_000_000_000 |0), // Channel ID, for each new channel there must be a new ID
					channelId: new BN(129), // Channel ID, for each new channel there must be a new ID
					addressA: new TonWeb.Address(msg.data.userAddress).toString(true, true, true), // A's funds will be withdrawn to this wallet address after the channel is closed
					addressB: (await wallet.getAddress()).toString(true, true, true), // B's funds will be withdrawn to this wallet address after the channel is closed
					initBalanceA: state.balanceA,
					initBalanceB: state.balanceB,
				};

				let channel = tonweb.payments.createChannel({
					...channelConfig,
					isA: false,
					myKeyPair: keyPair,
					hisPublicKey: Uint8Array.from(msg.data.userPublicKey),
				});

				channels.set(msg.data.userPublicKey.toString(), channel);

				// response
				ws.send(JSON.stringify({
					type: 'init',
					data: {
						channelConfig: {
							...channelConfig,
							channelId: channelConfig.channelId.toString(),
							initBalanceA: channelConfig.initBalanceA.toString(),
							initBalanceB: channelConfig.initBalanceB.toString(),
						},
						state: serializeState(state),
						serverPublicKey: Array.from(keyPair.publicKey),
					},
				}));

				console.log('requestInit', channelConfig, state)
			}
			// user deployed and topped up channel and ready to communication
			else if (msg.type === 'ready') {
				ws.send(JSON.stringify({
					type: 'info',
					data: {
						vehicles: sharing.vehicles,
					},
				}));
			}
			// user starts driving
			else if (msg.type === 'startDriving') {
				msg.data.state
				sharing.take(msg.data.vehicleId, );
				ws.send(JSON.stringify({
					type: 'info',
					data: {
						vehicles: sharing.vehicles,
					},
				}));
			}
		}
		catch (e) {
			console.error('ERR:', e);
		}
	});
});