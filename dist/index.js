(() => {
  // client/event-emitter.js
  var R = typeof Reflect === "object" ? Reflect : null;
  var ReflectApply = R && typeof R.apply === "function" ? R.apply : function ReflectApply2(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  };
  var ReflectOwnKeys;
  if (R && typeof R.ownKeys === "function") {
    ReflectOwnKeys = R.ownKeys;
  } else if (Object.getOwnPropertySymbols) {
    ReflectOwnKeys = function ReflectOwnKeys2(target) {
      return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
    };
  } else {
    ReflectOwnKeys = function ReflectOwnKeys2(target) {
      return Object.getOwnPropertyNames(target);
    };
  }
  function ProcessEmitWarning(warning) {
    if (console && console.warn)
      console.warn(warning);
  }
  var NumberIsNaN = Number.isNaN || function NumberIsNaN2(value) {
    return value !== value;
  };
  function EventEmitter() {
    EventEmitter.init.call(this);
  }
  EventEmitter.EventEmitter = EventEmitter;
  EventEmitter.prototype._events = void 0;
  EventEmitter.prototype._eventsCount = 0;
  EventEmitter.prototype._maxListeners = void 0;
  var defaultMaxListeners = 10;
  function checkListener(listener) {
    if (typeof listener !== "function") {
      throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
    }
  }
  Object.defineProperty(EventEmitter, "defaultMaxListeners", {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) {
        throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + ".");
      }
      defaultMaxListeners = arg;
    }
  });
  EventEmitter.init = function() {
    if (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) {
      this._events = /* @__PURE__ */ Object.create(null);
      this._eventsCount = 0;
    }
    this._maxListeners = this._maxListeners || void 0;
  };
  EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
    if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) {
      throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + ".");
    }
    this._maxListeners = n;
    return this;
  };
  function _getMaxListeners(that) {
    if (that._maxListeners === void 0)
      return EventEmitter.defaultMaxListeners;
    return that._maxListeners;
  }
  EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
    return _getMaxListeners(this);
  };
  EventEmitter.prototype.emit = function emit(type) {
    var args = [];
    for (var i = 1; i < arguments.length; i++)
      args.push(arguments[i]);
    var doError = type === "error";
    var events = this._events;
    if (events !== void 0)
      doError = doError && events.error === void 0;
    else if (!doError)
      return false;
    if (doError) {
      var er;
      if (args.length > 0)
        er = args[0];
      if (er instanceof Error) {
        throw er;
      }
      var err = new Error("Unhandled error." + (er ? " (" + er.message + ")" : ""));
      err.context = er;
      throw err;
    }
    var handler = events[type];
    if (handler === void 0)
      return false;
    if (typeof handler === "function") {
      ReflectApply(handler, this, args);
    } else {
      var len = handler.length;
      var listeners2 = arrayClone(handler, len);
      for (var i = 0; i < len; ++i)
        ReflectApply(listeners2[i], this, args);
    }
    return true;
  };
  function _addListener(target, type, listener, prepend) {
    var m;
    var events;
    var existing;
    checkListener(listener);
    events = target._events;
    if (events === void 0) {
      events = target._events = /* @__PURE__ */ Object.create(null);
      target._eventsCount = 0;
    } else {
      if (events.newListener !== void 0) {
        target.emit("newListener", type, listener.listener ? listener.listener : listener);
        events = target._events;
      }
      existing = events[type];
    }
    if (existing === void 0) {
      existing = events[type] = listener;
      ++target._eventsCount;
    } else {
      if (typeof existing === "function") {
        existing = events[type] = prepend ? [listener, existing] : [existing, listener];
      } else if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
      m = _getMaxListeners(target);
      if (m > 0 && existing.length > m && !existing.warned) {
        existing.warned = true;
        var w = new Error("Possible EventEmitter memory leak detected. " + existing.length + " " + String(type) + " listeners added. Use emitter.setMaxListeners() to increase limit");
        w.name = "MaxListenersExceededWarning";
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        ProcessEmitWarning(w);
      }
    }
    return target;
  }
  EventEmitter.prototype.addListener = function addListener(type, listener) {
    return _addListener(this, type, listener, false);
  };
  EventEmitter.prototype.on = EventEmitter.prototype.addListener;
  EventEmitter.prototype.prependListener = function prependListener(type, listener) {
    return _addListener(this, type, listener, true);
  };
  function onceWrapper() {
    if (!this.fired) {
      this.target.removeListener(this.type, this.wrapFn);
      this.fired = true;
      if (arguments.length === 0)
        return this.listener.call(this.target);
      return this.listener.apply(this.target, arguments);
    }
  }
  function _onceWrap(target, type, listener) {
    var state = { fired: false, wrapFn: void 0, target, type, listener };
    var wrapped = onceWrapper.bind(state);
    wrapped.listener = listener;
    state.wrapFn = wrapped;
    return wrapped;
  }
  EventEmitter.prototype.once = function once(type, listener) {
    checkListener(listener);
    this.on(type, _onceWrap(this, type, listener));
    return this;
  };
  EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
    checkListener(listener);
    this.prependListener(type, _onceWrap(this, type, listener));
    return this;
  };
  EventEmitter.prototype.removeListener = function removeListener(type, listener) {
    var list, events, position, i, originalListener;
    checkListener(listener);
    events = this._events;
    if (events === void 0)
      return this;
    list = events[type];
    if (list === void 0)
      return this;
    if (list === listener || list.listener === listener) {
      if (--this._eventsCount === 0)
        this._events = /* @__PURE__ */ Object.create(null);
      else {
        delete events[type];
        if (events.removeListener)
          this.emit("removeListener", type, list.listener || listener);
      }
    } else if (typeof list !== "function") {
      position = -1;
      for (i = list.length - 1; i >= 0; i--) {
        if (list[i] === listener || list[i].listener === listener) {
          originalListener = list[i].listener;
          position = i;
          break;
        }
      }
      if (position < 0)
        return this;
      if (position === 0)
        list.shift();
      else {
        spliceOne(list, position);
      }
      if (list.length === 1)
        events[type] = list[0];
      if (events.removeListener !== void 0)
        this.emit("removeListener", type, originalListener || listener);
    }
    return this;
  };
  EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
  EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
    var listeners2, events, i;
    events = this._events;
    if (events === void 0)
      return this;
    if (events.removeListener === void 0) {
      if (arguments.length === 0) {
        this._events = /* @__PURE__ */ Object.create(null);
        this._eventsCount = 0;
      } else if (events[type] !== void 0) {
        if (--this._eventsCount === 0)
          this._events = /* @__PURE__ */ Object.create(null);
        else
          delete events[type];
      }
      return this;
    }
    if (arguments.length === 0) {
      var keys = Object.keys(events);
      var key;
      for (i = 0; i < keys.length; ++i) {
        key = keys[i];
        if (key === "removeListener")
          continue;
        this.removeAllListeners(key);
      }
      this.removeAllListeners("removeListener");
      this._events = /* @__PURE__ */ Object.create(null);
      this._eventsCount = 0;
      return this;
    }
    listeners2 = events[type];
    if (typeof listeners2 === "function") {
      this.removeListener(type, listeners2);
    } else if (listeners2 !== void 0) {
      for (i = listeners2.length - 1; i >= 0; i--) {
        this.removeListener(type, listeners2[i]);
      }
    }
    return this;
  };
  function _listeners(target, type, unwrap) {
    var events = target._events;
    if (events === void 0)
      return [];
    var evlistener = events[type];
    if (evlistener === void 0)
      return [];
    if (typeof evlistener === "function")
      return unwrap ? [evlistener.listener || evlistener] : [evlistener];
    return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
  }
  EventEmitter.prototype.listeners = function listeners(type) {
    return _listeners(this, type, true);
  };
  EventEmitter.prototype.rawListeners = function rawListeners(type) {
    return _listeners(this, type, false);
  };
  EventEmitter.listenerCount = function(emitter, type) {
    if (typeof emitter.listenerCount === "function") {
      return emitter.listenerCount(type);
    } else {
      return listenerCount.call(emitter, type);
    }
  };
  EventEmitter.prototype.listenerCount = listenerCount;
  function listenerCount(type) {
    var events = this._events;
    if (events !== void 0) {
      var evlistener = events[type];
      if (typeof evlistener === "function") {
        return 1;
      } else if (evlistener !== void 0) {
        return evlistener.length;
      }
    }
    return 0;
  }
  EventEmitter.prototype.eventNames = function eventNames() {
    return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
  };
  function arrayClone(arr, n) {
    var copy = new Array(n);
    for (var i = 0; i < n; ++i)
      copy[i] = arr[i];
    return copy;
  }
  function spliceOne(list, index) {
    for (; index + 1 < list.length; index++)
      list[index] = list[index + 1];
    list.pop();
  }
  function unwrapListeners(arr) {
    var ret = new Array(arr.length);
    for (var i = 0; i < ret.length; ++i) {
      ret[i] = arr[i].listener || arr[i];
    }
    return ret;
  }

  // client/vehicle-simulator.js
  var VehicleSimulator = class extends EventEmitter {
    id;
    gas = 0;
    x = 50;
    y = 50;
    angle = 0;
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
      this.emit("update");
    }
    turn(angleDiff) {
      if (!this.driving) {
        return;
      }
      this.angle += angleDiff;
      this.emit("update");
    }
    start() {
      this.driving = true;
      this.emit("update");
    }
    end() {
      this.driving = false;
      this.emit("update");
    }
    useToken(token) {
      console.log("new token", token);
      this.token = token;
      setTimeout(() => {
        if (this.token === token) {
          console.log("token exipred");
          this.end();
        }
      }, 1e3 * 5);
    }
  };

  // client/client.js
  var BN = TonWeb.utils.BN;
  var toNano = TonWeb.utils.toNano;
  var providerUrl = "https://testnet.toncenter.com/api/v2/jsonRPC";
  var apiKey = "f089bfd4c3bf8c0e09658224622262223ec9a81683b13e08d9cf23fe546e54e5";
  var tonweb = new TonWeb(new TonWeb.HttpProvider(providerUrl, { apiKey }));
  var seed = TonWeb.utils.base64ToBytes("SX2sNmZ9N70oAqEClONE0p7uMTd3bbvpmp0URbkyXoo=");
  var Client = class extends EventEmitter {
    initBalance = toNano("0.02");
    keyPair = tonweb.utils.keyPairFromSeed(seed);
    wallet = tonweb.wallet.create({ publicKey: this.keyPair.publicKey });
    channel;
    state;
    walletAddress;
    fromWallet;
    vehicles = /* @__PURE__ */ new Map();
    drivingVehicle;
    async init({ channelConfig, state }) {
      this.walletAddress = await this.wallet.getAddress();
      console.log("client wallet", this.walletAddress.toString(true, true, true));
      this.channel = tonweb.payments.createChannel(channelConfig);
      this.state = state;
      this.fromWallet = this.channel.fromWallet({
        wallet: this.wallet,
        secretKey: this.keyPair.secretKey
      });
      const channelAddress = await this.channel.getAddress();
      console.log("channelAddress", channelAddress.toString(true, true, true));
      console.log("channel", this.channel);
      console.log("state", this.state);
      await this.fromWallet.deploy().send(toNano("0.05"));
      let waitForDeploy = () => {
        return new Promise((resolve) => {
          let checkDeploy = async () => {
            try {
              await this.channel.getChannelState();
            } catch {
              setTimeout(checkDeploy, 2e3);
              console.log("waiting for deploy...");
              return;
            }
            console.log("channel deployed");
            resolve();
          };
          checkDeploy();
        });
      };
      await waitForDeploy();
      await this.fromWallet.topUp({ coinsA: this.initBalance, coinsB: new BN(0) }).send(this.initBalance.add(toNano("0.05")));
      let waitForTopUp = () => {
        return new Promise((resolve) => {
          let checkBalance = async () => {
            let data = await this.channel.getData();
            if (data.balanceA.toNumber() >= this.initBalance.toNumber()) {
              resolve();
              console.log("topped up");
              console.log("balanceA =", data.balanceA.toString());
              console.log("balanceB =", data.balanceB.toString());
            } else {
              setTimeout(checkBalance, 2e3);
              console.log("waiting for top up...");
            }
          };
          checkBalance();
        });
      };
      await waitForTopUp();
      await this.fromWallet.init(this.state).send(toNano("0.05"));
      let waitForOpen = () => {
        return new Promise((resolve) => {
          let checkOpen = async () => {
            if (await this.channel.getChannelState() === TonWeb.payments.PaymentChannel.STATE_OPEN) {
              resolve();
              console.log("channel is open");
            } else {
              setTimeout(checkOpen, 2e3);
              console.log("waiting for channel open...");
            }
          };
          checkOpen();
        });
      };
      await waitForOpen();
      this.emit("init");
    }
    async getWalletBalance() {
      let address = await this.wallet.getAddress();
      return await tonweb.getBalance(address);
    }
    updateVehiclesInfo({ vehicles }) {
      vehicles.forEach((vehicleInfo) => {
        let vehicle = this.vehicles.get(vehicleInfo.id);
        if (!vehicle) {
          vehicle = new VehicleSimulator(vehicleInfo.id);
          this.vehicles.set(vehicleInfo.id, vehicle);
        } else if (vehicle.id !== this.drivingVehicle?.id) {
          vehicle.update(vehicleInfo);
        }
        let userId = this.keyPair.publicKey.toString();
        if (vehicleInfo.usingBy === userId) {
          if (!this.drivingVehicle) {
            this.drivingConfirmed({ vehicleId: vehicleInfo.id });
          }
          this.drivingVehicle = vehicleInfo;
        }
        vehicle.gas = vehicleInfo.gas;
        vehicle.driving = vehicleInfo.inUse;
      });
      this.emit("vehicles-update");
    }
    async startDriving({ vehicleId }) {
      this.state.balanceA = this.state.balanceA.sub(toNano("0.01"));
      this.state.balanceB = this.state.balanceB.add(toNano("0.01"));
      this.state.seqnoA = this.state.seqnoA.add(new BN(1));
      let signature = await this.channel.signState(this.state);
      this.emit("start-driving", {
        vehicleId,
        signature,
        state: this.state
      });
    }
    #payTimer;
    async drivingConfirmed({ vehicleId }) {
      let vehicle = this.vehicles.get(vehicleId);
      vehicle.start();
      this.drivingVehicle = vehicle;
      this.state.balanceA = this.state.balanceA.sub(toNano("0.01"));
      this.state.balanceB = this.state.balanceB.add(toNano("0.01"));
      this.state.seqnoA = this.state.seqnoA.add(new BN(1));
      let signature = await this.channel.signState(this.state);
      this.#payTimer = setInterval(() => {
        this.emit("pay", {
          vehicleId,
          signature,
          state: this.state
        });
      }, 5e3);
    }
    async endDriving() {
      if (!this.drivingVehicle) {
        return;
      }
      let signature = await this.channel.signClose(this.state);
      this.emit("end-driving", {
        vehicleId: this.drivingVehicle.id,
        signature,
        state: this.state
      });
      this.drivingVehicle = null;
      clearInterval(this.#payTimer);
    }
  };

  // client/ui.js
  var initUI = (client2) => {
    setInterval(async () => {
      document.querySelector("#wallet-address").textContent = (await client2.wallet.getAddress()).toString(true, true, true);
      document.querySelector("#wallet-balance").textContent = TonWeb.utils.fromNano(await client2.getWalletBalance());
      try {
        document.querySelector("#channel-open").textContent = await client2.channel.getChannelState() === TonWeb.payments.PaymentChannel.STATE_OPEN;
      } catch {
      }
      ;
    }, 2e3);
    client2.on("vehicles-update", () => {
      document.body.classList.remove("loading");
      document.querySelector(".vehicles").innerHTML = "";
      document.querySelector("#channel-address").textContent = client2.channel.address.toString(true, true, true);
      document.querySelector("#channel-balance-user").textContent = TonWeb.utils.fromNano(client2.state.balanceA);
      document.querySelector("#channel-balance-server").textContent = TonWeb.utils.fromNano(client2.state.balanceB);
      document.querySelector("#vehicle-id").textContent = client2.drivingVehicle?.id;
      document.querySelector("#vehicle-driving-token").textContent = client2.drivingVehicle?.token;
      [...client2.vehicles.values()].forEach((vehicle) => {
        let html = `<div id="${vehicle.id}" class="vehicle ${vehicle.driving ? "in-use" : "free"}"><img src="./img/yellow-car.svg"></div>`;
        document.querySelector(".vehicles").insertAdjacentHTML("beforeend", html);
        document.querySelector(".vehicles").onclick = (e) => {
          let id = e.target.closest(".vehicle")?.id;
          if (id) {
            startDriving(id);
          }
        };
      });
    });
    let startDriving = (vehicleId) => {
      document.querySelector(`[id="${vehicleId}"]`)?.classList.remove("free");
      document.querySelector(`[id="${vehicleId}"]`)?.classList.add("in-use");
      client2.startDriving({ vehicleId });
    };
    document.querySelector("button#end").onclick = () => {
      client2.endDriving();
    };
  };

  // client/ws.js
  var BN2 = TonWeb.utils.BN;
  var toNano2 = TonWeb.utils.toNano;
  var initWS = (client2) => {
    let serializeState = (state) => {
      return {
        balanceA: state.balanceA.toString(),
        balanceB: state.balanceB.toString(),
        seqnoA: state.seqnoA.toString(),
        seqnoB: state.seqnoB.toString()
      };
    };
    let deserializeState = (state) => {
      return {
        balanceA: new BN2(state.balanceA),
        balanceB: new BN2(state.balanceB),
        seqnoA: new BN2(state.seqnoA),
        seqnoB: new BN2(state.seqnoB)
      };
    };
    let ws;
    try {
      ws = new WebSocket(localStorage.local ? "wss://localhost:8080" : "ws://172.14.51.12:8080");
    }
    catch {
      document.body.classList.remove("loading");
      document.body.prepend("ERR: WebSocket is not connected!");
    }
    ws.addEventListener("error", async (e) => {
      document.body.classList.remove("loading");
      document.body.prepend("ERR: WebSocket is not connected!");
    });
    ws.addEventListener("open", async (e) => {
      console.log("ws connected");
      ws.send(JSON.stringify({
        type: "requestInit",
        data: {
          userAddress: (await client2.wallet.getAddress()).toString(true, true, true),
          initUserBalance: client2.initBalance.toString(),
          userPublicKey: Array.from(client2.keyPair.publicKey)
        }
      }));
    });
    ws.addEventListener("message", async (e) => {
      let msg = JSON.parse(e.data);
      if (msg.type === "init") {
        await client2.init({
          channelConfig: {
            ...msg.data.channelConfig,
            channelId: new BN2(msg.data.channelConfig.channelId),
            addressA: new TonWeb.Address(msg.data.channelConfig.addressA),
            addressB: new TonWeb.Address(msg.data.channelConfig.addressB),
            initBalanceA: new BN2(msg.data.channelConfig.initBalanceA),
            initBalanceB: new BN2(msg.data.channelConfig.initBalanceB),
            isA: true,
            myKeyPair: client2.keyPair,
            hisPublicKey: Uint8Array.from(msg.data.serverPublicKey)
          },
          state: deserializeState(msg.data.state)
        });
        ws.send(JSON.stringify({
          type: "ready"
        }));
      } else if (msg.type === "info") {
        client2.updateVehiclesInfo(msg.data);
      } else if (msg.type === "drivingConfirmed") {
        client2.drivingConfirmed(msg.data);
      }
    });
    client2.on("start-driving", ({ vehicleId, state, signature }) => {
      ws.send(JSON.stringify({
        type: "startDriving",
        data: { vehicleId, state, signature: Array.from(signature) }
      }));
    });
    client2.on("pay", ({ vehicleId, state, signature }) => {
      ws.send(JSON.stringify({
        type: "startDriving",
        data: { vehicleId, state, signature: Array.from(signature) }
      }));
    });
    client2.on("end-driving", ({ vehicleId, state, signature }) => {
      ws.send(JSON.stringify({
        type: "endDriving",
        data: { vehicleId, state, signature: Array.from(signature) }
      }));
    });
  };

  // client/index.js
  var client = new Client();
  initWS(client);
  initUI(client);
})();
