export class Vehicle {
	id = String(Math.random() * 100000 |0);
	inUse = false;
	usingBy = null; // userId
	gas = 100;
	gasIntervalId;

	take(userId) {
		this.inUse = true;
		this.usingBy = userId;

		this.gasIntervalId = setInterval(() => {
			this.gas -= 1;
		}, 1000);
	}

	free() {
		this.inUse = false;
		this.usingBy = null;

		clearTimeout(this.gasIntervalId);
	}
}