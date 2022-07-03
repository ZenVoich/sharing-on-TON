export let view = {
	updateVehiclesInfo(vehicles) {
		vehicles.forEach((vehicle) => {
			document.body.classList.remove('loading');

			let html = `<div id="${vehicle.id}" class="vehicle ${vehicle.inUse ? 'in-use' : 'free'}"><img src="./img/yellow-car.svg"></div>`;
			document.querySelector('.vehicles').insertAdjacentHTML('beforeend', html);

			document.querySelector('.vehicles').onclick = (e) => {
				let id = e.target.closest('.vehicle')?.id;
				if (id) {
					this.startDriving(id);
				}
			}
		})
	},
	startDriving(vehicleId) {
		document.querySelector(`[id="${vehicleId}"]`)?.classList.remove('free');
		document.querySelector(`[id="${vehicleId}"]`)?.classList.add('in-use');
		ws.send(JSON.stringify({
			type: 'startDriving',
			data: {
				vehicleId: vehicleId,
			},
		}));
		document.querySelector('.title').textContent = 'You are driving now! :)';
	}
}