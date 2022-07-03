import {Vehicle} from './vehicle.js';

export class Sharing {
	vehicles = [new Vehicle, new Vehicle, new Vehicle, new Vehicle, new Vehicle];
	userByToken = new Map;

	getAvailable() {
		return vehicles.filter((vehicle) => {
			return !vehicle.inUse;
		});
	}

	take(vehicleId, userId) {
		let vehicle = this.vehicles.find((vehicle) => {
			return vehicle.id === vehicleId;
		});
		let userDriving = this.vehicles.find((vehicle) => {
			return vehicle.usingBy === userId;
		});
		if (vehicle && !vehicle.inUse && !userDriving) {
			this.grantAccess(userId);
			vehicle.take(userId);
			return vehicle;
		}
	}

	free(userId) {
		let vehicle = this.vehicles.find((vehicle) => {
			return vehicle.usingBy === userId;
		});
		vehicle?.free();
	}

	checkAccess(token, userId) {
		this.userByToken.get(token) === userId;
	}

	grantAccess(userId) {
		let token = this.generateToken();
		this.userByToken.set(token, userId);
	}

	revokeAccess(token) {
		this.userByToken.delete(token);
	}

	generateToken() {
		return String(Math.random() * 1_000_000_000 |0);
	}
}