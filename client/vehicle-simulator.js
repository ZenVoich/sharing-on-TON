import {EventEmitter} from './event-emitter.js';

export class VehicleSimulator extends EventEmitter {
	id;
	gas = 0;
	x = 50;
	y = 50;
	angle = 0; // deg
	driving = false;
	token;

	constructor(id) {
		super();
		this.id = id;
	}

	update(data) {
		this.gas = data.gas;
		this.x = data.x;
		this.y = data.y;
		this.angle = data.angle;
		this.driving = data.driving;

		if (data.token) {
			this.useToken(data.token);
		}
	}

	move(forward = true) {
		if (!this.driving) {
			return;
		}
		this.x += 1;
		this.emit('update');
	}

	turn(angleDiff) {
		if (!this.driving) {
			return;
		}
		this.angle += angleDiff;
		this.emit('update');
	}

	start() {
		this.driving = true;
		this.emit('update');
	}

	end() {
		this.driving = false;
		this.emit('update');
	}

	useToken(token) {
		console.log('new token', token)
		this.token = token;

		// simulate that token expires after 10 sec
		setTimeout(() => {
			if (this.token === token) {
				console.log('token exipred');
				this.end();
			}
		}, 1000 * 5);
	}
}