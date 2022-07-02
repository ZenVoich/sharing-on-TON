import {Vehicle} from './vehicle.js';

class Sharing {
	vehicles = [new Vehicle, new Vehicle, new Vehicle, new Vehicle, new Vehicle];
	userByToken = new Map;

	getAvailable() {
		return vehicles.filter((vehicle) => {
			return !vehicle.inUse;
		});
	}

	take(vehicleId, userId) {
		let vehicle = vehicles.find((vehicle) => {
			return vehicle.id === vehicleId;
		});
		if (vehicle && !vehicle.inUse) {
			this.grantAccess(userId);
			vehicle.take(userId);
		}
	}

	checkAccess(token, userId) {
		userByToken.get(token) === userId;
	}

	grantAccess(userId) {
		let token = this.generateToken();
		userByToken.set(token, userId);
	}

	revokeAccess(token) {
		userByToken.delete(token);
	}

	generateToken() {
		return String(Math.random() * 1_000_000_000 |0);
	}
}