import {view} from './view.js';

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
window.ws = ws;

let initBalance = toNano('0.01');

ws.addEventListener('open', async (e) => {
	console.log('connected');
	console.log('wallet', (await wallet.getAddress()).toString(true, true, true))

	ws.send(JSON.stringify({
		type: 'requestInit',
		data: {
			userAddress: (await wallet.getAddress()).toString(true, true, true),
			initUserBalance: initBalance.toString(),
			userPublicKey: Array.from(keyPair.publicKey),
		},
	}));
});

let channel;
let state;
let fromWallet;

ws.addEventListener('message', async (e) => {
	let msg = JSON.parse(e.data);

	console.log('message', msg);

	if (msg.type === 'init') {
		// 1. create channel
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

		fromWallet = channel.fromWallet({
			wallet: wallet,
			secretKey: keyPair.secretKey,
		});

		const channelAddress = await channel.getAddress(); // address of this payment channel smart-contract in blockchain
		console.log('channelAddress', channelAddress.toString(true, true, true));
		console.log('channel', channel);
		console.log('state', state);

		// 2. deploy channel
		// await fromWallet.deploy().send(toNano('0.05'));

		// wait for deploy
		// previous `await deploy()` doesn't guarantee that channel has been deployed
		let waitForDeploy = () => {
			return new Promise((resolve) => {
				let checkDeploy = async () => {
					try {
						await channel.getChannelState();
					}
					catch {
						setTimeout(checkDeploy, 2000);
						console.log('waiting for deploy...');
						return;
					}
					console.log('channel deployed');
					resolve();
				};
				checkDeploy();
			});
		};
		await waitForDeploy();

		// 3. top up initial balance
		// await fromWallet
		// 	.topUp({coinsA: initBalance, coinsB: new BN(0)})
		// 	.send(initBalance.add(toNano('0.05'))); // +0.05 TON to network fees

		// wait for top up
		let waitForTopUp = () => {
			return new Promise((resolve) => {
				let checkBalance = async () => {
					let data = await channel.getData();
					if (data.balanceA.toNumber() >= initBalance.toNumber()) {
						resolve();
						console.log('topped up');
						console.log('balanceA =', data.balanceA.toString());
						console.log('balanceB =', data.balanceB.toString());
					}
					else {
						setTimeout(checkBalance, 2000);
						console.log('waiting for top up...');
					}
				};
				checkBalance();
			});
		};
		await waitForTopUp();

		// 4. init channel
		// await fromWallet.init(state).send(toNano('0.05'));

		// wait for init/open
		let waitForOpen = () => {
			return new Promise((resolve) => {
				let checkOpen = async () => {
					if (await channel.getChannelState() === TonWeb.payments.PaymentChannel.STATE_OPEN) {
						resolve();
						console.log('channel is open');
					}
					else {
						setTimeout(checkOpen, 2000);
						console.log('waiting for channel open...');
					}
				};
				checkOpen();
			});
		};
		await waitForOpen();

		ws.send(JSON.stringify({
			type: 'ready',
		}));
	}
	else if (msg.type === 'info') {
		view.updateVehiclesInfo(msg.data.vehicles);
	}
});