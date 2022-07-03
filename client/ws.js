const BN = TonWeb.utils.BN;
const toNano = TonWeb.utils.toNano;

export let initWS = (client) => {
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

	let ws = new WebSocket(localStorage.local ? 'ws://localhost:8080' : 'ws://172.14.51.12:8080');

	ws.addEventListener('error', async (e) => {
		document.body.classList.remove('loading');
		document.body.prepend('ERR: WS is not connected!');
	});

	ws.addEventListener('open', async (e) => {
		console.log('ws connected');

		ws.send(JSON.stringify({
			type: 'requestInit',
			data: {
				userAddress: (await client.wallet.getAddress()).toString(true, true, true),
				initUserBalance: client.initBalance.toString(),
				userPublicKey: Array.from(client.keyPair.publicKey),
			},
		}));
	});

	ws.addEventListener('message', async (e) => {
		let msg = JSON.parse(e.data);

		// console.log('message', msg);

		if (msg.type === 'init') {
			await client.init({
				channelConfig: {
					...msg.data.channelConfig,
					channelId: new BN(msg.data.channelConfig.channelId),
					addressA: new TonWeb.Address(msg.data.channelConfig.addressA),
					addressB: new TonWeb.Address(msg.data.channelConfig.addressB),
					initBalanceA: new BN(msg.data.channelConfig.initBalanceA),
					initBalanceB: new BN(msg.data.channelConfig.initBalanceB),
					isA: true,
					myKeyPair: client.keyPair,
					hisPublicKey: Uint8Array.from(msg.data.serverPublicKey),
				},
				state: deserializeState(msg.data.state),
			});

			ws.send(JSON.stringify({
				type: 'ready',
			}));
		}
		else if (msg.type === 'info') {
			client.updateVehiclesInfo(msg.data);
		}
		else if (msg.type === 'drivingConfirmed') {
			client.drivingConfirmed(msg.data);
		}
	});

	client.on('start-driving', ({vehicleId, state, signature}) => {
		ws.send(JSON.stringify({
			type: 'startDriving',
			data: {vehicleId, state, signature: Array.from(signature)},
		}));
	});

	client.on('pay', ({vehicleId, state, signature}) => {
		ws.send(JSON.stringify({
			type: 'startDriving',
			data: {vehicleId, state, signature: Array.from(signature)},
		}));
	});

	client.on('end-driving', ({vehicleId, state, signature}) => {
		ws.send(JSON.stringify({
			type: 'endDriving',
			data: {vehicleId, state, signature: Array.from(signature)},
		}));
	});
}