const BN = TonWeb.utils.BN;
const toNano = TonWeb.utils.toNano;

const providerUrl = 'https://testnet.toncenter.com/api/v2/jsonRPC'; // TON HTTP API url. Use this url for testnet
const apiKey = 'f089bfd4c3bf8c0e09658224622262223ec9a81683b13e08d9cf23fe546e54e5'; // Obtain your API key in https://t.me/tontestnetapibot
const tonweb = new TonWeb(new TonWeb.HttpProvider(providerUrl, {apiKey})); // Initialize TON SDK

const seed = TonWeb.utils.base64ToBytes('SX2sNmZ9N70oAqEClONE0p7uMTd3bbvpmp0URbkyXoo=');
const keyPair = tonweb.utils.keyPairFromSeed(seed);
const wallet = tonweb.wallet.create({
	publicKey: keyPair.publicKey
});

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

const ws = new WebSocket('ws://localhost:8080');

ws.addEventListener('open', async (e) => {
	console.log('connected');
	console.log(await wallet.getAddress())
	ws.send(JSON.stringify({
		type: 'requestInit',
		data: {
			userAddress: (await wallet.getAddress()).toString(true, true, true),
			initUserBalance: toNano('0.2').toString(),
			userPublicKey: Array.from(keyPair.publicKey),
		},
	}));
});

let channel;
let state;

ws.addEventListener('message', async (e) => {
	let msg = JSON.parse(e.data);

	console.log('message', msg);

	if (msg.type === 'init') {
		channel = tonweb.payments.createChannel({
			...msg.data.channelConfig,
			channelId: new BN(msg.data.channelConfig.channelId),
			addressA: new TonWeb.Address(msg.data.channelConfig.addressA),
			addressB: new TonWeb.Address(msg.data.channelConfig.addressB),
			initBalanceA: new BN(msg.data.channelConfig.initBalanceA),
			initBalanceB: new BN(msg.data.channelConfig.initBalanceB),
			isA: true,
			myKeyPair: keyPair,
			hisPublicKey: Uint8Array.from(msg.data.serverPublicKey),
		});
		state = deserializeState(msg.data.state);
		// msg.data.serverPublicKey
		console.log(channel, state)
		const channelAddress = await channel.getAddress(); // address of this payment channel smart-contract in blockchain
		console.log('channelAddress =', channelAddress.toString(true, true, true));
	}
});