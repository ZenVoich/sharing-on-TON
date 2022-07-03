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
let usedTokens = new Map; // hisPublicKey => tokenCount

let tokenPrice = toNano('0.01');
let userInitBalance = toNano('0.1');

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
	setInterval(() => {
		ws.send(JSON.stringify({
			type: 'info',
			data: {
				vehicles: sharing.vehicles,
			},
		}));
	}, 1000);

	let userId;
	let channel;

	let sendToken = (userId) => {
		usedTokens.set(userId, (usedTokens.get(userId) || 0) + 1);

		ws.send(JSON.stringify({
			type: 'newToken',
			data: {
				token: String(Math.random() * 1_000_000 |0),
			},
		}));
	}


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

				userId = msg.data.userPublicKey.toString();

				states.set(userId, state);

				// channel
				let channelConfig = {
					// channelId: new BN(Math.random() * 1_000_000_000 |0), // Channel ID, for each new channel there must be a new ID
					channelId: new BN(129), // Channel ID, for each new channel there must be a new ID
					addressA: new TonWeb.Address(msg.data.userAddress).toString(true, true, true), // A's funds will be withdrawn to this wallet address after the channel is closed
					addressB: (await wallet.getAddress()).toString(true, true, true), // B's funds will be withdrawn to this wallet address after the channel is closed
					initBalanceA: state.balanceA,
					initBalanceB: state.balanceB,
				};

				channel = tonweb.payments.createChannel({
					...channelConfig,
					isA: false,
					myKeyPair: keyPair,
					hisPublicKey: Uint8Array.from(msg.data.userPublicKey),
				});

				channels.set(userId, channel);

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
				let vehicle = sharing.take(msg.data.vehicleId, userId);
				if (!vehicle) {
					return;
				}

				let state = deserializeState(msg.data.state);
				let signatureA = Uint8Array.from(msg.data.signature);

				if (!(await channel.verifyState(state, signatureA))) {
					console.error('startDriving: invalid signature');
					return;
				}
				// ??
				let signatureB = await channel.signState(state);
				console.log('signed');

				states.set(userId, state);

				ws.send(JSON.stringify({
					type: 'drivingConfirmed',
					data: {
						vehicle: vehicle,
					},
				}));
				sendToken(userId);
			}
			else if (msg.type === 'pay') {
				let state = deserializeState(msg.data.state);
				let signatureA = Uint8Array.from(msg.data.signature);

				// todo check userPublicKey
				if (!(await channel.verifyState(state, signatureA))) {
					console.error('pay: invalid signature');
					return;
				}

				// check total pay is enough
				let tokenCount = usedTokens.get(userId) || 0;
				if ((tokenCount + 1) * tokenPrice < state.balanceB && state.balanceA >= 0) {
					console.error('pay: not enough');
					return;
				}

				states.set(userId, state);
				sendToken(userId);
			}
			else if (msg.type === 'endDriving') {
				let state = deserializeState(msg.data.state);
				let signatureA = Uint8Array.from(msg.data.signature);

				if (!(await channel.verifyState(state, signatureA))) {
					console.error('end-driving: invalid signature');
					return;
				}

				// check total pay is enough
				let tokenCount = usedTokens.get(userId) || 0;
				if ((tokenCount + 1) * tokenPrice < state.balanceB && state.balanceA >= 0) {
					console.error('end-driving: not enough');
					return;
				}

				// verify close
				if (!(await channel.verifyClose(state, signatureA))) {
					console.error('end-driving: invalid signature');
					return;
				}

				let fromWallet = channel.fromWallet({
					wallet: wallet,
					secretKey: keyPair.secretKey,
				});

				await fromWallet.close({
					...state,
					hisSignature: signatureA,
				}).send(toNano('0.05'));

				// reset
				states.delete(userId);
				channels.delete(userId);
				usedTokens.delete(userId);

				console.log('channel closed')
			}
		}
		catch (e) {
			console.error('ERR:', e);
		}
	});
});