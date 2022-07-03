export let initUI = (client) => {
	client.on('vehicles-update', () => {
		document.body.classList.remove('loading');

		client.vehicles.forEach((vehicle) => {
			let html = `<div id="${vehicle.id}" class="vehicle ${vehicle.inUse ? 'in-use' : 'free'}"><img src="./img/yellow-car.svg"></div>`;
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
}