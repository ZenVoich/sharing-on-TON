import {EventEmitter} from './event-emitter.js';
import {VehicleSimulator} from './vehicle-simulator.js';

const BN = TonWeb.utils.BN;
const toNano = TonWeb.utils.toNano;

const providerUrl = 'https://testnet.toncenter.com/api/v2/jsonRPC'; // TON HTTP API url. Use this url for testnet
const apiKey = 'f089bfd4c3bf8c0e09658224622262223ec9a81683b13e08d9cf23fe546e54e5'; // Obtain your API key in https://t.me/tontestnetapibot
const tonweb = new TonWeb(new TonWeb.HttpProvider(providerUrl, {apiKey})); // Initialize TON SDK

const seed = TonWeb.utils.base64ToBytes('SX2sNmZ9N70oAqEClONE0p7uMTd3bbvpmp0URbkyXoo=');
// const seed = TonWeb.utils.base64ToBytes('QaHTtsSMQ13RrQrDH5RrSSu+MBHBwwrNQrvrI203BmM=');
// const seed = TonWeb.utils.base64ToBytes('LDi+xuOFN6QbeFLcD02eG+++1d5ALYXQzKIyKlK37Sc=');

export class Client extends EventEmitter {
	initBalance = toNano('0.02');
	keyPair = tonweb.utils.keyPairFromSeed(seed);
	wallet = tonweb.wallet.create({publicKey: this.keyPair.publicKey});

	channel;
	state;
	walletAddress;
	fromWallet;
	vehicles = new Map;
	drivingVehicle;

	async init({channelConfig, state}) {
		this.walletAddress = await this.wallet.getAddress();

		console.log('client wallet', this.walletAddress.toString(true, true, true))

		// 1. create channel
		this.channel = tonweb.payments.createChannel(channelConfig);

		this.state = state;

		this.fromWallet = this.channel.fromWallet({
			wallet: this.wallet,
			secretKey: this.keyPair.secretKey,
		});

		const channelAddress = await this.channel.getAddress(); // address of this payment channel smart-contract in blockchain
		console.log('channelAddress', channelAddress.toString(true, true, true));
		console.log('channel', this.channel);
		console.log('state', this.state);

		// 2. deploy channel
		await this.fromWallet.deploy().send(toNano('0.05'));

		// wait for deploy
		// previous `await deploy()` doesn't guarantee that channel has been deployed
		let waitForDeploy = () => {
			return new Promise((resolve) => {
				let checkDeploy = async () => {
					try {
						await this.channel.getChannelState();
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
		await this.fromWallet
			.topUp({coinsA: this.initBalance, coinsB: new BN(0)})
			.send(this.initBalance.add(toNano('0.05'))); // +0.05 TON to network fees

		// wait for top up
		let waitForTopUp = () => {
			return new Promise((resolve) => {
				let checkBalance = async () => {
					let data = await this.channel.getData();
					if (data.balanceA.toNumber() >= this.initBalance.toNumber()) {
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
		await this.fromWallet.init(this.state).send(toNano('0.05'));

		// wait for init/open
		let waitForOpen = () => {
			return new Promise((resolve) => {
				let checkOpen = async () => {
					if (await this.channel.getChannelState() === TonWeb.payments.PaymentChannel.STATE_OPEN) {
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

		this.emit('init');
	}

	async getWalletBalance() {
		let address = await this.wallet.getAddress();
		return await tonweb.getBalance(address);
	}

	updateVehiclesInfo({vehicles}) {
		vehicles.forEach((vehicleInfo) => {
			let vehicle = this.vehicles.get(vehicleInfo.id);
			if (!vehicle) {
				vehicle = new VehicleSimulator(vehicleInfo.id);
				this.vehicles.set(vehicleInfo.id, vehicle);
			}
			else if (vehicle.id !== this.drivingVehicle?.id) {
				vehicle.update(vehicleInfo);
			}

			let userId = this.keyPair.publicKey.toString();
			if (vehicleInfo.usingBy === userId) {
				if (!this.drivingVehicle) {
					this.drivingConfirmed({vehicleId: vehicleInfo.id});
				}
				this.drivingVehicle = vehicleInfo;
			}

			vehicle.gas = vehicleInfo.gas;
			vehicle.driving = vehicleInfo.inUse;
		});

		this.emit('vehicles-update');
	}

	async startDriving({vehicleId}) {
		this.state.balanceA = this.state.balanceA.sub(toNano('0.01'));
		this.state.balanceB = this.state.balanceB.add(toNano('0.01'));
		this.state.seqnoA = this.state.seqnoA.add(new BN(1));

		let signature = await this.channel.signState(this.state);

		this.emit('start-driving', {
			vehicleId,
			signature,
			state: this.state,
		});
	}

	#payTimer;

	async drivingConfirmed({vehicleId}) {
		let vehicle = this.vehicles.get(vehicleId);
		vehicle.start();
		this.drivingVehicle = vehicle;

		this.state.balanceA = this.state.balanceA.sub(toNano('0.01'));
		this.state.balanceB = this.state.balanceB.add(toNano('0.01'));
		this.state.seqnoA = this.state.seqnoA.add(new BN(1));

		let signature = await this.channel.signState(this.state);

		this.#payTimer = setInterval(() => {
			this.emit('pay', {
				vehicleId,
				signature,
				state: this.state,
			});
		}, 5000);
	}

	async endDriving() {
		if (!this.drivingVehicle) {
			return;
		}
		let signature = await this.channel.signClose(this.state);

		this.emit('end-driving', {
			vehicleId: this.drivingVehicle.id,
			signature,
			state: this.state,
		});

		this.drivingVehicle = null;
		clearInterval(this.#payTimer);
	}
}