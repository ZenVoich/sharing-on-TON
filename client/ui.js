export let initUI = (client) => {
	setInterval(async () => {
		document.querySelector('#wallet-address').textContent = (await client.wallet.getAddress()).toString(true, true, true);
		document.querySelector('#wallet-balance').textContent = TonWeb.utils.fromNano(await client.getWalletBalance());
		try {
			document.querySelector('#channel-open').textContent = await client.channel.getChannelState() === TonWeb.payments.PaymentChannel.STATE_OPEN;
		}
		catch {};
	}, 2000);

	client.on('vehicles-update', () => {
		document.body.classList.remove('loading');
		document.querySelector('.vehicles').innerHTML = '';

		document.querySelector('#channel-address').textContent = client.channel.address.toString(true, true, true);
		document.querySelector('#channel-balance-user').textContent = TonWeb.utils.fromNano(client.state.balanceA);
		document.querySelector('#channel-balance-server').textContent = TonWeb.utils.fromNano(client.state.balanceB);

		document.querySelector('#vehicle-id').textContent = client.drivingVehicle?.id;
		document.querySelector('#vehicle-driving-token').textContent = client.drivingVehicle?.token;

		[...client.vehicles.values()].forEach((vehicle) => {
			let html = `<div id="${vehicle.id}" class="vehicle ${vehicle.driving ? 'in-use' : 'free'}"><img src="./img/yellow-car.svg"></div>`;
			document.querySelector('.vehicles').insertAdjacentHTML('beforeend', html);

			document.querySelector('.vehicles').onclick = (e) => {
				let id = e.target.closest('.vehicle')?.id;
				if (id) {
					startDriving(id);
				}
			}
		});
	});

	let startDriving = (vehicleId) => {
		document.querySelector(`[id="${vehicleId}"]`)?.classList.remove('free');
		document.querySelector(`[id="${vehicleId}"]`)?.classList.add('in-use');
		client.startDriving({vehicleId});
		// document.querySelector('.title').textContent = 'You are driving now! :)';
	};

	document.querySelector('button#end').onclick = () => {
		client.endDriving();
	};
}